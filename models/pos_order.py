# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError
import logging

class PosOrder(models.Model):
    _inherit = 'pos.order'

    nota_credito_creada = fields.Boolean('Nota credito creada', default=False)
    permitir_devolver = fields.Boolean('Permitir devolver', related="session_id.config_id.permitir_devolver")

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

        accion = self.refund()
        nuevo = self.env['pos.order'].browse(accion['res_id'])
        for p in self.payment_ids:
            nuevo.add_payment({
                'name': _('return'),
                'pos_order_id': nuevo.id,
                'amount': -p.amount,
                'payment_date': fields.Date.context_today(self),
                'payment_method_id': p.payment_method_id.id,
            })

        nuevo.action_pos_order_paid()
        if 'factura_original_id' in self.env['account.move']._fields:
            nuevo.with_context(default_factura_original_id=self.account_move.id).action_pos_order_invoice()
        else:
            nuevo.action_pos_order_invoice()

        nuevo.nota_credito_creada = True
        self.nota_credito_creada = True

        return accion

class PosOrderLine(models.Model):
    _inherit = "pos.order.line"

    note = fields.Char('Nota')
