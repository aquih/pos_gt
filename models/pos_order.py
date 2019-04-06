# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _
import logging

class PosOrder(models.Model):
    _inherit = 'pos.order'

    employee_id = fields.Many2one('hr.employee','Empleado')

    def _prepare_analytic_account(self, line):
        if line.order_id.config_id.analytic_account_id:
            return line.order_id.config_id.analytic_account_id.id
        else:
            return False

    def _force_picking_done(self, picking):
        if self.config_id.analytic_account_id:
            picking.cuenta_analitica_id = self.config_id.analytic_account_id
        res = super(PosOrder, self)._force_picking_done(picking)

    @api.model
    def _order_fields(self, ui_order):
        res = super(PosOrder, self)._order_fields(ui_order)
        sesion = self.env['pos.session'].search([('id', '=', res['session_id'])], limit=1)
        if sesion.config_id.opcion_empleado:
            res['employee_id'] = ui_order['employee_id'] or False
        return res

    def _prepare_invoice(self):
        res = super(PosOrder, self)._prepare_invoice()
        if self.amount_total < 0:
            res['journal_id'] = self.config_id.diario_nota_credito_id.id
        return res

    @api.multi
    def nota_credito(self):
        if self.config_id.diario_nota_credito_id:
            accion = self.refund()
            nueva = self.env['pos.order'].browse(accion['res_id'])
            for p in self.statement_ids:
                nueva.add_payment({
                    'amount': -p.amount,
                    'payment_date': fields.Date.context_today(self),
                    'payment_name': _('return'),
                    'journal': p.journal_id.id,
                })
            nueva.action_pos_order_invoice()
            nueva.invoice_id.numero_viejo = self.invoice_id.name
            logging.warn(nueva.invoice_id.numero_viejo)
            nueva.invoice_id.sudo().action_invoice_open()
            nueva.account_move = nueva.invoice_id.move_id

            return accion

    def _reconcile_payments(self):
        cash_basis_percentage_before_rec = {move: move.line_ids._get_matched_percentage() for move in self.mapped('account_move')}
        for order in self:
            aml = order.statement_ids.mapped('journal_entry_ids') | order.account_move.line_ids | order.invoice_id.move_id.line_ids
            aml = aml.filtered(lambda r: not r.reconciled and r.account_id.internal_type == 'receivable' and r.partner_id == order.partner_id.commercial_partner_id)

            try:
                # Cash returns will be well reconciled
                # Whereas freight returns won't be
                # "c'est la vie..."
                aml.with_context(skip_tax_cash_basis_entry=True).reconcile()
            except Exception:
                # There might be unexpected situations where the automatic reconciliation won't
                # work. We don't want the user to be blocked because of this, since the automatic
                # reconciliation is introduced for convenience, not for mandatory accounting
                # reasons.
                # It may be interesting to have the Traceback logged anyway
                # for debugging and support purposes
                _logger.exception('Reconciliation did not work for order %s', order.name)
        for move in self.mapped('account_move'):
            partial_reconcile = self.env['account.partial.reconcile'].search([
                '|',
                ('credit_move_id.move_id', '=', move.id),
                ('debit_move_id.move_id', '=', move.id)], limit=1)
            if partial_reconcile:
	                # In case none of the order debit move lines have been reconciled
	                # there is no need to create the tax cash basis entries as nothing has been reconciled
	                # a known case is when the the bank journal credit account is set to a receivable account,
	                # which has as effect to fully reconcile the payment line with its counterpart,
	                # leaving no payment lines to reconcile with the order debit lines.
	                partial_reconcile.create_tax_cash_basis_entry(cash_basis_percentage_before_rec[move])
