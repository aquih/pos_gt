# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError
from odoo.osv.expression import AND
import logging

class PosOrder(models.Model):
    _inherit = 'pos.order'

    take_out = fields.Boolean('Pedido para llevar')

    def _get_invoice_lines_values(self, line_values, pos_order_line):
        res = super(PosOrder, self)._get_invoice_lines_values(line_values, pos_order_line)
        if pos_order_line.order_id.config_id.analytic_account_id:
            res['analytic_distribution'] = dict([(str(pos_order_line.order_id.config_id.analytic_account_id.id), 100),])
        return res

    def _prepare_invoice_vals(self):
        res = super(PosOrder, self)._prepare_invoice_vals()
        if self.amount_total < 0 and self.config_id.diario_nota_credito_id:
            res['journal_id'] = self.config_id.diario_nota_credito_id.id
        return res
    
    def _create_order_picking(self):
        self = self.with_context(analytic_account_id=self.config_id.analytic_account_id)
        super(PosOrder, self)._create_order_picking()
    
    def _export_for_ui(self, order):
        res = super(PosOrder, self)._export_for_ui(order)
        res.update({'take_out': order.take_out})
        return res

    def nota_credito(self):
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

        return {
            'type': 'ir.actions.act_window',
            'res_model': 'pos.order',
            'views': [[False, "form"]],
            'res_id': nuevo.id,
        }

    @api.model
    def _order_fields(self, ui_order):
        res = super(PosOrder, self)._order_fields(ui_order)
        res.update({'take_out': ui_order.get('take_out'),})
        return res

class PosSession(models.Model):
    _inherit = 'pos.session'
                
    def _create_picking_at_end_of_session(self):
        self = self.with_context(analytic_account_id=self.config_id.analytic_account_id)
        super(PosSession, self)._create_picking_at_end_of_session()
