"""Read existing BO01 admission/context; compose domain service without editing BO01.
The parent supplies bounded department source grants and verified callbacks. This
module does not expand grants or register a production sender/destination.
"""
from domain_adapter import Hold,need,sha

class ParentHost:
    def __init__(self, owner_intake, domain_adapter, grant_loader):
        self.intake=owner_intake;self.domain=domain_adapter;self.grant_loader=grant_loader
    def context(self, *, account_id, message_id):
        m=self.intake.matter(account_id,message_id)
        row=self.intake.db.execute('SELECT matter_id FROM bo01_admissions WHERE account_id=? AND message_id=?',(account_id,message_id)).fetchone()
        need(row is not None and row[0]==m['matter_id'],'owner source lacks retained admission')
        g=self.grant_loader(m['matter_id'])
        need(g['enabled'] and g['account_id']==account_id,'source grant inactive or wrong account')
        need(g['matter_context_hash']==sha(m),'grant bound to stale matter/context')
        need(g['valid_from']<=self.domain.clock()<g['expires_at'],'source grant expired/not current')
        return {'matter_id':m['matter_id'],'department':g['department'],'source_ids':g['source_ids']}
    def prepare(self,request, *,account_id,message_id):
        return self.domain.prepare(request,self.context(account_id=account_id,message_id=message_id))
    def continue_approval(self,request, *,account_id,message_id):
        return self.domain.continue_approval(request,self.context(account_id=account_id,message_id=message_id), revalidate_admission=lambda:self.context(account_id=account_id,message_id=message_id))
