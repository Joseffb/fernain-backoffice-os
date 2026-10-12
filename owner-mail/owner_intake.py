"""Additive, parent-authenticated BO-01 owner request intake and matter store.

This module never connects to mail. The caller must supply authenticated account
identity and an independently configured request-channel attestation. Mail labels
are observations only. Message text, including any command-looking text, cannot
establish owner identity or channel authorization.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

from boundary import NoSend, require


def canonical(x):
    return json.dumps(x, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sha(x):
    return hashlib.sha256(x.encode("utf-8")).hexdigest()


class OwnerIntake:
    """Durable source and current-context registry, separate from live consumers."""
    def __init__(self, db, *, owner_address, clock=time.time):
        self.db = db if isinstance(db, sqlite3.Connection) else sqlite3.connect(str(db), timeout=30, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.clock = clock
        self.owner = self._address(owner_address)
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS bo01_messages(
          account_id TEXT NOT NULL, provider TEXT NOT NULL, message_id TEXT NOT NULL,
          matter_id TEXT NOT NULL, original_message_id TEXT NOT NULL,
          source_version TEXT NOT NULL, source_digest TEXT NOT NULL,
          thread_id TEXT NOT NULL, from_address TEXT NOT NULL, reply_to TEXT,
          to_addresses TEXT NOT NULL, cc_addresses TEXT NOT NULL, bcc_addresses TEXT NOT NULL,
          rfc_message_id TEXT NOT NULL, in_reply_to TEXT, references_json TEXT NOT NULL,
          subject TEXT NOT NULL, body TEXT NOT NULL, labels TEXT NOT NULL,
          observed_at REAL NOT NULL, PRIMARY KEY(account_id,provider,message_id));
        CREATE TABLE IF NOT EXISTS bo01_context(
          account_id TEXT NOT NULL, provider TEXT NOT NULL, message_id TEXT NOT NULL,
          matter_id TEXT NOT NULL, sequence INTEGER NOT NULL, source_version TEXT NOT NULL,
          source_digest TEXT NOT NULL, thread_id TEXT NOT NULL, payload TEXT NOT NULL,
          PRIMARY KEY(account_id,provider,message_id),
          UNIQUE(account_id,provider,matter_id,sequence));
        CREATE TABLE IF NOT EXISTS bo01_admissions(
          account_id TEXT NOT NULL, provider TEXT NOT NULL, message_id TEXT NOT NULL,
          matter_id TEXT NOT NULL, channel_id TEXT NOT NULL, admitted_at REAL NOT NULL,
          PRIMARY KEY(account_id,provider,message_id));
        CREATE TABLE IF NOT EXISTS bo01_outbound_anchors(
          account_id TEXT NOT NULL, message_id TEXT NOT NULL, original_message_id TEXT NOT NULL,
          rfc_message_id TEXT NOT NULL,
          thread_id TEXT NOT NULL, reply_to TEXT NOT NULL, original_source_digest TEXT NOT NULL,
          receipt_id TEXT NOT NULL, receipt_sha256 TEXT NOT NULL, verified_by TEXT NOT NULL,
          verified_at REAL NOT NULL, PRIMARY KEY(account_id,message_id));
        """)

    @contextmanager
    def _transaction(self):
        self.db.execute('BEGIN IMMEDIATE')
        try:
            yield
            self.db.commit()
        except BaseException:
            self.db.rollback()
            raise

    @staticmethod
    def _address(s):
        require(type(s) is str and re.fullmatch(r"[^\s<>@]+@[^\s<>@]+", s), "invalid email address")
        return s.lower()

    @staticmethod
    def _nonempty(s, field, limit=2000):
        require(type(s) is str and 0 < len(s) <= limit and s.strip(), f"invalid {field}")
        return s

    def admit(self, observation, *, authenticated_account, trusted_channel):
        """Admit an owner request only through a parent-attested channel.

        trusted_channel is parent-owned configuration plus an independent
        request classification, never a mail field. Its per-message attestation
        binds the exact provider ID and source digest after quoted/third-party
        text is excluded by the parent reviewer/classifier.
        """
        require(type(observation) is dict and set(observation) == {
            "provider", "message_id", "account_id", "from", "subject", "body",
            "thread_id", "source_version", "labels", "observed_at", "reply_to",
            "inbox_visible", "sent_visible", "channel_id", "to", "cc", "bcc",
            "rfc_message_id", "in_reply_to", "references"}, "invalid message observation")
        require(type(trusted_channel) is dict and set(trusted_channel) == {
            "account_id", "channel_id", "owner_address", "enabled", "explicit_owner_request",
            "attested_message_id", "attested_source_digest", "decision_id", "decision_version",
            "decision_sha256", "valid_from", "expires_at", "authorizer_principal", "target_to"}, "invalid trusted channel configuration")
        owner = self._address(trusted_channel["owner_address"])
        require(trusted_channel["enabled"] is True and owner == self.owner, "owner channel disabled or owner mismatch")
        require(type(trusted_channel['decision_id']) is str and trusted_channel['decision_id'] and type(trusted_channel['decision_version']) is str and trusted_channel['decision_version'], 'decision record identity/version missing')
        require(re.fullmatch(r'[0-9a-f]{64}', trusted_channel['decision_sha256'] or '') is not None and trusted_channel['valid_from'] <= self.clock() < trusted_channel['expires_at'], 'decision hash/validity invalid')
        require(type(authenticated_account) is dict and set(authenticated_account)=={'provider','account_id','principal_id','owner_address','verified_at','identity_evidence_sha256'},'authenticated parent mailbox identity required')
        account=self._nonempty(authenticated_account['account_id'],"authenticated account",300)
        require(authenticated_account['provider']=='gmail' and account==trusted_channel['account_id']==observation['account_id'],'authenticated mailbox/account mismatch')
        require(self._address(authenticated_account['owner_address'])==owner and authenticated_account['principal_id']==trusted_channel['authorizer_principal'],'owner principal/channel authorizer mismatch')
        require(type(authenticated_account['verified_at']) in (int,float) and 0<=self.clock()-authenticated_account['verified_at']<=10 and re.fullmatch(r'[0-9a-f]{64}',authenticated_account['identity_evidence_sha256'] or '') is not None,'mailbox identity evidence stale or invalid')
        require(observation["channel_id"] == trusted_channel["channel_id"], "message did not arrive through explicit owner channel")
        require(self._address(observation["from"]) == owner, "owner From does not match authenticated owner principal")
        require(observation["provider"] == "gmail", "unsupported provider")
        msgid = self._nonempty(observation["message_id"], "provider message ID", 500)
        thread = self._nonempty(observation["thread_id"], "provider thread ID", 500)
        version = self._nonempty(observation["source_version"], "source version", 500)
        subject = self._nonempty(observation["subject"], "subject", 998)
        body = self._nonempty(observation["body"], "body", 100000)
        require(type(observation["labels"]) is list and all(type(x) is str for x in observation["labels"]), "labels must be observations")
        require(type(observation["inbox_visible"]) is bool and type(observation["sent_visible"]) is bool, "invalid mailbox visibility")
        require(observation["inbox_visible"] or observation["sent_visible"], "message not observed in SENT or INBOX")
        # Presence of either/both labels does not grant authority; the trusted
        # account+channel observation above is the authority boundary.
        reply_to = observation["reply_to"]
        if reply_to is not None:
            reply_to = self._address(reply_to)
        def addresses(key):
            v=observation[key]; require(type(v) is list and all(type(x) is str for x in v),f'invalid {key}')
            result=[self._address(x) for x in v]; require(len(set(result))==len(result),f'duplicate {key}'); return result
        tos=addresses('to');ccs=addresses('cc');bccs=addresses('bcc')
        require(tos==[self._address(trusted_channel['target_to'])] and ccs==[] and bccs==[], 'owner request destination/CC scope mismatch')
        refs=observation['references'];require(type(refs) is list and all(type(x) is str and x.strip() for x in refs),'invalid RFC References')
        rfc=observation['rfc_message_id']; require(type(rfc) is str and rfc.startswith('<') and rfc.endswith('>'),'RFC Message-ID required')
        irt=observation['in_reply_to']; require(irt is None or type(irt) is str,'invalid RFC In-Reply-To')
        payload = {k: observation[k] for k in ("provider", "message_id", "account_id", "from", "subject", "body", "thread_id", "source_version", "reply_to")}
        payload.update({"to":tos,"cc":ccs,"bcc":bccs,"rfc_message_id":rfc,"in_reply_to":irt,"references":refs})
        digest = sha(canonical(payload))
        require(trusted_channel["explicit_owner_request"] is True and trusted_channel["attested_message_id"] == msgid and trusted_channel["attested_source_digest"] == digest,
                "independent exact owner-request attestation missing; ordinary mail and quoted instructions are ignored")
        matter = "matter_" + sha(account + "\0gmail\0" + msgid)[:32]
        now = float(observation["observed_at"])
        require(now >= 0 and now <= self.clock() + 60, "invalid observation time")
        with self._transaction():
            existing = self.db.execute("SELECT * FROM bo01_messages WHERE account_id=? AND provider='gmail' AND message_id=?", (account, msgid)).fetchone()
            if existing:
                require(existing["source_digest"] == digest, "immutable source identity changed")
                adm = self.db.execute("SELECT matter_id,channel_id FROM bo01_admissions WHERE account_id=? AND provider='gmail' AND message_id=?", (account,msgid)).fetchone()
                return {"admitted": adm is not None, "deduplicated": True,
                        "matter_id": existing["matter_id"],
                        "original_message_id": existing["original_message_id"],
                        "source_version": existing["source_version"],
                        "source_digest": existing["source_digest"]}
            self.db.execute("INSERT INTO bo01_messages VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                account,"gmail",msgid,matter,msgid,version,digest,thread,owner,reply_to,canonical(tos),canonical(ccs),canonical(bccs),rfc,irt,canonical(refs),subject,body,canonical(sorted(set(observation["labels"]))),now))
            # In production the parent supplies this attestation only after its
            # owner-request classifier confirms a request, independently of text.
            # The explicit channel represents that verified owner intent.
            self.db.execute("INSERT INTO bo01_admissions VALUES(?,?,?,?,?,?)", (account,"gmail",msgid,matter,trusted_channel["channel_id"],now))
            self.db.execute("INSERT INTO bo01_context VALUES(?,?,?,?,?,?,?,?,?)", (account,"gmail",msgid,matter,0,version,digest,thread,canonical(payload)))
        return {"admitted": True, "deduplicated": False, "matter_id": matter, "original_message_id": msgid, "source_version": version, "source_digest": digest}

    def append_context(self, *, account_id, message_id, linked_message_id, source_version,
                       thread_id, from_address, reply_to, subject, body, verified_link):
        """Append a separately versioned reply only with trusted threading proof."""
        require(type(verified_link) is dict and set(verified_link)=={'verified','provider','mailbox_state','account_id','message_id','original_message_id','thread_id','source_digest','current_digest','rfc_message_id','in_reply_to','references','to','cc','bcc','anchor_message_id','anchor_rfc_message_id','anchor_reply_to','provider_readback_ref'}, "exact trusted provider linkage required")
        require(verified_link['verified'] is True and verified_link['account_id']==account_id and verified_link['message_id']==message_id and verified_link['original_message_id']==linked_message_id, 'linkage identity mismatch')
        require(verified_link['provider']=='gmail' and verified_link['mailbox_state']=='SENT','owner follow-up must be independently observed in SENT')
        orig = self.db.execute("SELECT * FROM bo01_messages WHERE account_id=? AND provider='gmail' AND message_id=?", (account_id, linked_message_id)).fetchone()
        require(orig is not None, "unknown original matter")
        require(thread_id == orig["thread_id"] == verified_link['thread_id'], "thread mismatch; same subject cannot link matters")
        mid = self._nonempty(message_id, "provider message ID", 500)
        ver = self._nonempty(source_version, "source version", 500)
        require(verified_link['source_digest']==orig['source_digest'] and verified_link['rfc_message_id'].startswith('<') and verified_link['rfc_message_id'].endswith('>'), 'source/RFC linkage mismatch')
        anchor=self.db.execute('SELECT * FROM bo01_outbound_anchors WHERE account_id=? AND message_id=?',(account_id,verified_link['anchor_message_id'])).fetchone()
        require(anchor is not None and anchor['original_message_id']==linked_message_id and anchor['original_source_digest']==orig['source_digest'] and anchor['thread_id']==thread_id and anchor['rfc_message_id']==verified_link['anchor_rfc_message_id'] and anchor['reply_to']==verified_link['anchor_reply_to'], 'unknown or changed verified outbound reply anchor')
        require(self._address(from_address)==self.owner, 'owner SENT provenance mismatch')
        require(verified_link['in_reply_to']==anchor['rfc_message_id'] and anchor['rfc_message_id'] in verified_link['references'], 'RFC reply chain does not match outbound anchor')
        tos=verified_link['to'];require(type(tos) is list and tos==[anchor['reply_to']], 'follow-up recipient is not exact verified Reply-To group')
        require(verified_link['cc']==[] and verified_link['bcc']==[],'follow-up CC/BCC expansion denied')
        require(type(verified_link['provider_readback_ref']) is str and verified_link['provider_readback_ref'], 'provider readback evidence missing')
        payload = {"provider":"gmail","message_id":mid,"account_id":account_id,"from":self._address(from_address),"subject":self._nonempty(subject,"subject",998),"body":self._nonempty(body,"body",100000),"thread_id":thread_id,"source_version":ver,"reply_to":self._address(reply_to) if reply_to else None,"to":tos,"cc":[] ,"bcc":[],"rfc_message_id":verified_link['rfc_message_id'],"in_reply_to":verified_link['in_reply_to'],"references":verified_link['references']}
        d = sha(canonical(payload)); require(d==verified_link['current_digest'],'current source bytes/version differ from parent verified readback'); matter = orig["matter_id"]
        with self._transaction():
            prior = self.db.execute("SELECT * FROM bo01_context WHERE account_id=? AND provider='gmail' AND message_id=?",(account_id,mid)).fetchone()
            if prior:
                require(prior["source_digest"] == d and prior["matter_id"] == matter,"context identity conflict")
                return {"matter_id":matter,"sequence":prior["sequence"],"deduplicated":True}
            seq = self.db.execute("SELECT COALESCE(MAX(sequence),-1)+1 FROM bo01_context WHERE account_id=? AND provider='gmail' AND matter_id=?",(account_id,matter)).fetchone()[0]
            self.db.execute("INSERT INTO bo01_context VALUES(?,?,?,?,?,?,?,?,?)",(account_id,"gmail",mid,matter,seq,ver,d,thread_id,canonical(payload)))
        return {"matter_id":matter,"sequence":seq,"source_version":ver,"source_digest":d,"deduplicated":False}

    def matter(self, account_id, message_id):
        row=self.db.execute("SELECT * FROM bo01_messages WHERE account_id=? AND provider='gmail' AND message_id=?",(account_id,message_id)).fetchone()
        if row is None: raise NoSend("unknown original matter")
        contexts=self.db.execute("SELECT * FROM bo01_context WHERE account_id=? AND provider='gmail' AND matter_id=? ORDER BY sequence",(account_id,row["matter_id"])).fetchall()
        return {"matter_id":row["matter_id"],"original":{"message_id":row["original_message_id"],"source_version":row["source_version"],"source_digest":row["source_digest"],"thread_id":row["thread_id"]},"current_context":[dict(x) for x in contexts]}

    def register_outbound_anchor(self, *, account_id, message_id, original_message_id, provider_readback):
        """Parent-only registration from an actual sent-provider readback."""
        require(type(provider_readback) is dict and set(provider_readback)=={'verified','provider','account_id','message_id','thread_id','rfc_message_id','to','reply_to','original_source_digest','receipt_id','receipt_sha256','verified_by','verified_at'}, 'exact sent-provider readback required')
        require(provider_readback['verified'] is True and provider_readback['provider']=='gmail' and provider_readback['account_id']==account_id and provider_readback['message_id']==message_id,'provider readback identity mismatch')
        orig=self.db.execute('SELECT * FROM bo01_messages WHERE account_id=? AND provider=\'gmail\' AND message_id=?',(account_id,original_message_id)).fetchone()
        require(orig is not None and orig['source_digest']==provider_readback['original_source_digest'],'outbound anchor not bound to admitted original source')
        require(provider_readback['thread_id']==orig['thread_id'],'outbound provider thread differs from original matter')
        reply=self._address(provider_readback['reply_to'])
        require(provider_readback['to']==[self.owner],'outbound answer recipient is not the fixed owner')
        rfc=provider_readback['rfc_message_id']; require(type(rfc) is str and rfc.startswith('<') and rfc.endswith('>'), 'verified RFC Message-ID required')
        require(type(provider_readback['receipt_id']) is str and provider_readback['receipt_id'] and re.fullmatch(r'[0-9a-f]{64}',provider_readback['receipt_sha256'] or '') and type(provider_readback['verified_by']) is str and provider_readback['verified_by'],'provider receipt/verifier evidence missing')
        require(type(provider_readback['verified_at']) in (int,float) and 0<=provider_readback['verified_at']<=self.clock()+1,'provider readback time invalid')
        with self._transaction():
            old=self.db.execute('SELECT * FROM bo01_outbound_anchors WHERE account_id=? AND message_id=?',(account_id,message_id)).fetchone()
            values=(account_id,message_id,original_message_id,rfc,provider_readback['thread_id'],reply,orig['source_digest'],provider_readback['receipt_id'],provider_readback['receipt_sha256'],provider_readback['verified_by'],float(provider_readback['verified_at']))
            if old:
                require(tuple(old)==values, 'immutable outbound anchor conflict')
                return
            self.db.execute('INSERT INTO bo01_outbound_anchors VALUES(?,?,?,?,?,?,?,?,?,?,?)',values)


def validate_owner_factual_answer(intake, gateway, request, *, authenticated_actor,
                                  grant, runtime_identity, current_readbacks, now=None):
    """Validate owner-context policy before the established ParentBridge route.

    Call this at arm and again immediately before transport. The host adapter
    owns those calls and binds the returned digest to its durable attempt.
    """
    from boundary import digest
    now = time.time() if now is None else now
    fields={"policy_id","enabled","revoked","valid_from","expires_at","decision_id","decision_version","decision_sha256","decision_payload","account_id","actor_id","from_address","reply_to","recipient","matter_id","original_message_id","context_bindings","reply_anchor","factual_sources","request_hashes","action","communication_class","allow_cc","allow_bcc","allow_external","allow_commitment","producer_id","department","authority_id","recipient_policy_id","effect_owner_id","backend_kind","backend_key"}
    require(type(grant) is dict and set(grant)==fields,"exact parent-loaded owner answer policy required")
    require(type(grant['policy_id']) is str and grant['policy_id'], 'owner policy identity required')
    payload=grant['decision_payload']
    decision_fields={"decision_id","version","authorizer_principal","account_id","actor_id","from_address","reply_to","recipient","matter_id","original_message_id","context_bindings","reply_anchor","factual_sources","request_hashes","action","communication_class","producer_id","department","authority_id","recipient_policy_id","effect_owner_id","backend_kind","backend_key","valid_from","expires_at","allow_cc","allow_bcc","allow_external","allow_commitment"}
    require(type(payload) is dict and set(payload)==decision_fields,"exact standing decision payload required")
    require(type(payload) is dict and hashlib.sha256(canonical(payload).encode()).hexdigest()==grant['decision_sha256'],"decision evidence digest mismatch")
    for left,right in (("decision_id","decision_id"),("version","decision_version"),("account_id","account_id"),("actor_id","actor_id"),("from_address","from_address"),("reply_to","reply_to"),("recipient","recipient"),("matter_id","matter_id"),("original_message_id","original_message_id"),("context_bindings","context_bindings"),("reply_anchor","reply_anchor"),("factual_sources","factual_sources"),("request_hashes","request_hashes"),("action","action"),("communication_class","communication_class"),("producer_id","producer_id"),("department","department"),("authority_id","authority_id"),("recipient_policy_id","recipient_policy_id"),("effect_owner_id","effect_owner_id"),("backend_kind","backend_kind"),("backend_key","backend_key"),("valid_from","valid_from"),("expires_at","expires_at"),("allow_cc","allow_cc"),("allow_bcc","allow_bcc"),("allow_external","allow_external"),("allow_commitment","allow_commitment")):
        require(payload[left]==grant[right],"decision payload/grant scope mismatch")
    require(grant['enabled'] is True and grant['revoked'] is False and type(grant['valid_from']) in (int,float) and type(grant['expires_at']) in (int,float) and grant['valid_from']<=now<grant['expires_at'],"decision missing, revoked or expired")
    require(type(runtime_identity) is dict and set(runtime_identity)=={"provider","account_id","principal_id","actor_id","from_address","reply_to","decision_id","decision_version","decision_sha256","verified_at","identity_evidence_sha256"},"authenticated runtime identity required")
    require(grant['from_address']=='operator@example.com' and runtime_identity["provider"]=="gmail" and runtime_identity["account_id"]==grant["account_id"] and runtime_identity["actor_id"]==grant["actor_id"]==authenticated_actor and runtime_identity["from_address"]==grant["from_address"] and runtime_identity["reply_to"]==grant["reply_to"],"runtime account/actor/sender/reply-to changed")
    require(type(runtime_identity['verified_at']) in (int,float) and 0<=now-runtime_identity['verified_at']<=10 and re.fullmatch(r'[0-9a-f]{64}',runtime_identity['identity_evidence_sha256'] or '') is not None,'runtime identity readback stale or invalid')
    require(runtime_identity["decision_id"]==grant["decision_id"] and runtime_identity["decision_version"]==grant["decision_version"] and runtime_identity["decision_sha256"]==grant["decision_sha256"],"decision version/hash changed")
    require(payload['authorizer_principal']==runtime_identity['principal_id'] and type(grant['request_hashes']) is list and bool(grant['request_hashes']) and all(type(x) is str and re.fullmatch(r'[0-9a-f]{64}',x) for x in grant['request_hashes']),'decision authorizer/content scope invalid')
    require(grant["recipient"]=="operator@example.com" and grant["allow_cc"] is False and grant["allow_bcc"] is False and grant["allow_external"] is False and grant["allow_commitment"] is False,"grant exceeds private factual response scope")
    require(grant["action"]=="informational_reply" and grant["communication_class"]=="AGENTIC","only factual AGENTIC response is eligible")
    require(grant["effect_owner_id"] and type(grant["effect_owner_id"]) is str,"single effect owner missing")
    require(grant['backend_kind'] in ('sqlite','google_docs') and type(grant['backend_key']) is str and grant['backend_key'],'single durable backend identity missing')
    require(type(request) is dict and request.get("matter_id")==grant["matter_id"] and request.get("producer_id")==grant["producer_id"] and request.get("department")==grant["department"] and request.get("authority_id")==grant["authority_id"] and request.get("recipient_policy_id")==grant["recipient_policy_id"],"request actor/matter/recipient scope changed")
    require(request.get('message_id')!=grant['original_message_id'],"outgoing effect ID must be distinct from original source ID")
    matter=intake.matter(grant["account_id"],grant["original_message_id"])
    require(matter["matter_id"]==grant["matter_id"],"request is not bound to admitted original matter")
    require(request.get('thread_id')==matter['original']['thread_id'],'outgoing reply must remain bound to original provider thread')
    contexts=[{"message_id":x["message_id"],"source_version":x["source_version"],"source_digest":x["source_digest"]} for x in matter["current_context"]]
    require(type(grant['context_bindings']) is list and grant['context_bindings']==contexts,"original/current context version or digest drift")
    ra=grant['reply_anchor'];require(type(ra) is dict and set(ra)=={'reply_message_id','observed_gmail_thread_id','source_digest','verified_at','expires_at'},'exact parent-verified reply anchor required')
    latest=contexts[-1]
    require(ra['reply_message_id']==latest['message_id'] and ra['observed_gmail_thread_id']==matter['original']['thread_id'] and ra['source_digest']==latest['source_digest'] and type(ra['verified_at']) in (int,float) and type(ra['expires_at']) in (int,float) and ra['verified_at']<=now<ra['expires_at'],'reply anchor not bound to latest admitted context or is stale')
    require(type(grant['factual_sources']) is list and bool(grant['factual_sources']) and type(current_readbacks) is dict,"current authorized factual source readbacks required")
    require(all(type(x) is dict and set(x)=={"provider","account_id","object_id","version","sha256","purpose"} for x in grant['factual_sources']),"invalid exact source scope")
    for source in grant['factual_sources']:
        key=source['provider']+"/"+source['account_id']+"/"+source['object_id']
        require(source['purpose']=="factual_question" and current_readbacks.get(key)==source,"source missing, changed or outside factual purpose")
    factual_keys=[x['provider']+"/"+x['account_id']+"/"+x['object_id'] for x in grant['factual_sources']]
    require(set(current_readbacks)==set(factual_keys),'current source loader supplied an unapproved extra source')
    approved_ids=[x['message_id'] for x in contexts]+[x['object_id'] for x in grant['factual_sources']]
    require(request.get('source_ids')==approved_ids,"rendered source set differs from grant")
    require(digest(request) in grant['request_hashes'],"exact answer content was not approved by standing grant")
    binding={"decision_id":grant['decision_id'],"decision_version":grant['decision_version'],"decision_sha256":grant['decision_sha256'],"account_id":grant['account_id'],"principal_id":runtime_identity['principal_id'],"identity_evidence_sha256":runtime_identity['identity_evidence_sha256'],"actor_id":grant['actor_id'],"from_address":grant['from_address'],"reply_to":grant['reply_to'],"recipient":grant['recipient'],"matter_id":grant['matter_id'],"original_message_id":grant['original_message_id'],"context_bindings":contexts,"reply_anchor":ra,"factual_sources":grant['factual_sources'],"request_hash":digest(request),"effect_owner_id":grant['effect_owner_id'],"backend_kind":grant['backend_kind'],"backend_key":grant['backend_key']}
    binding['binding_sha256']=hashlib.sha256(canonical(binding).encode()).hexdigest()
    return binding
