# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError
import logging

class PosOrder(models.Model):
    _inherit = 'pos.order'

    pedido_origen_id = fields.Many2one('pos.order', string='Pedido Origen')
    nota_credito_creada = fields.Boolean('Nota credito creada', default=False)
    permitir_devolver = fields.Boolean('Permitir devolver', related='session_id.config_id.permitir_devolver')

    def _prepare_invoice_line(self, order_line):
        res = super(PosOrder, self)._prepare_invoice_line(order_line)
        if order_line.order_id.config_id.analytic_account_id:
            res['analytic_account_id'] = order_line.order_id.config_id.analytic_account_id.id
        return res

    def _prepare_invoice_vals(self):
        res = super(PosOrder, self)._prepare_invoice_vals()
        if self.amount_total < 0 and self.config_id.diario_nota_credito_id:
            res['journal_id'] = self.config_id.diario_nota_credito_id.id
        logging.warn(res)
        return res
        
    def refund(self):
        res = super(PosOrder, self).refund()
        nuevo = self.browse(res['res_id'])
        nuevo.pedido_origen_id = self
        
        return res

    def nota_credito(self):
        if self.nota_credito_creada:
            raise UserError('La nota de crédito ya ha sido creada para este pedido.')

        res = self.refund()
        nuevo = self.browse(res['res_id'])
        for p in self.payment_ids:
            nuevo.add_payment({
                'name': _('return'),
                'pos_order_id': nuevo.id,
                'amount': -p.amount,
                'payment_date': fields.Date.context_today(self),
                'payment_method_id': p.payment_method_id.id,
            })

        nuevo.action_pos_order_paid()
        nuevo._create_order_picking()
        nuevo.action_pos_order_invoice()

        nuevo.nota_credito_creada = True
        self.nota_credito_creada = True

        return res

#class PosOrderLine(models.Model):
#    _inherit = "pos.order.line"

    # Compone un bug que no calcula los impuestos cuando se agrega una nueva
    # linea desde la interfaz normal de Odoo.
#    tax_ids = fields.Many2many('account.tax', string='Taxes', readonly=False)
