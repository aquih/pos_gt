# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError
import logging

class PosOrder(models.Model):
    _inherit = 'pos.order'

    nota_credito_creada = fields.Boolean('Nota credito creada', default=False)

    def _prepare_invoice_line(self, order_line):
        res = super(PosOrder, self)._prepare_invoice_line(order_line)
        if order_line.order_id.config_id.analytic_account_id:
            res['analytic_account_id'] = order_line.order_id.config_id.analytic_account_id.id
        return res

    def _force_picking_done(self, picking):
        if self.config_id.analytic_account_id:
            picking.cuenta_analitica_id = self.config_id.analytic_account_id
        res = super(PosOrder, self)._force_picking_done(picking)

    def _prepare_invoice(self):
        res = super(PosOrder, self)._prepare_invoice()
        if self.amount_total < 0:
            res['journal_id'] = self.config_id.diario_nota_credito_id.id
        return res

    def nota_credito(self):
        if self.nota_credito_creada:
            raise UserError('La nota de crédito ya ha sido creada para este pedido.')

        if 1 or self.config_id.diario_nota_credito_id:
            accion = self.refund()
            nueva = self.env['pos.order'].browse(accion['res_id'])
            for p in self.payment_ids:
                nueva.add_payment({
                    'name': _('return'),
                    'pos_order_id': nueva.id,
                    'amount': -p.amount,
                    'payment_date': fields.Date.context_today(self),
                    'payment_method_id': p.payment_method_id.id,
                })
            nueva.action_pos_order_paid()
            nueva.action_pos_order_invoice()
            if 'factura_original_id' in self.env['account.move']._fields:
                nueva.account_move.factura_original_id = self.account_move.id
            nueva.account_move.sudo().post()

            self.nota_credito_creada = True

            return accion

class PosOrderLine(models.Model):
    _inherit = "pos.order.line"

    note = fields.Char('Nota')
