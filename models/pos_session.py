# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _
import logging

class PosSession(models.Model):
    _inherit = 'pos.session'

    def _confirm_orders(self):
        for session in self:
            for order in session.order_ids.filtered(lambda order: order.state == 'paid'):
                logging.warn(order)
                order.sudo().action_pos_order_invoice()
                order.invoice_id.sudo().action_invoice_open()
                order.account_move = order.invoice_id.move_id

        res = super(PosSession, self)._confirm_orders()

        for session in self:
            for order in session.order_ids.filtered(lambda order: order.state == 'invoiced'):
                invoice = order.invoice_id
                lines_to_reconcile = self.env['account.move.line']
                for statement in order.statement_ids:
                    lines_to_reconcile += statement.journal_entry_ids.line_ids.filtered(lambda r: not r.reconciled and r.account_id.internal_type in ('payable', 'receivable'))
                invoice.sudo().register_payment(lines_to_reconcile)
