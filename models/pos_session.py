# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _

class PosSession(models.Model):
    _inherit = 'pos.session'

    # def _confirm_orders(self):
    #     res = super(PosSession, self)._confirm_orders()
    #     for session in self:
    #         for order in session.order_ids.filtered(lambda order: order.state == 'invoiced'):
    #             invoice = order.invoice_id
    #             if invoice:
    #                 lines_to_reconcile = self.env['account.move.line']
    #                 for statement in order.statement_ids:
    #                     for sline in statement.line_ids:
    #                         lines_to_reconcile += sline.journal_entry_ids.filtered(lambda r: not r.reconciled and r.account_id.internal_type in ('payable', 'receivable'))
    #                 invoice.register_payment(lines_to_reconcile)
