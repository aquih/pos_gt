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

    def _force_picking_done(self, picking):
        if self.config_id.analytic_account_id:
            picking.cuenta_analitica_id = self.config_id.analytic_account_id
        res = super(PosOrder, self)._force_picking_done(picking)

    def _prepare_invoice_vals(self):
        res = super(PosOrder, self)._prepare_invoice_vals()
        if self.amount_total < 0 and self.config_id.diario_nota_credito_id:
            res['journal_id'] = self.config_id.diario_nota_credito_id.id
        logging.warn(res)
        return res
        
    def nota_credito(self):
        """Create a copy of order  for refund order"""
        refund_orders = self.env['pos.order']
        for order in self:
            current_session = self.env['pos.session'].search([('user_id','=',self.env.user.id), ('state','=','opened')])
            if not current_session:
                raise UserError('Para poder generar nota de crédito tiene que tener una sesión abierta con su usuario')
            refund_order = order.copy({
                'name': order.name + _(' REFUND'),
                'session_id': current_session.id,
                'date_order': fields.Datetime.now(),
                'pos_reference': order.pos_reference,
                'lines': False,
                'amount_tax': -order.amount_tax,
                'amount_total': -order.amount_total,
                'amount_paid': 0,
            })
            for line in order.lines:
                PosOrderLineLot = self.env['pos.pack.operation.lot']
                for pack_lot in line.pack_lot_ids:
                    PosOrderLineLot += pack_lot.copy()
                line.copy({
                    'name': line.name + _(' REFUND'),
                    'qty': -line.qty,
                    'order_id': refund_order.id,
                    'price_subtotal': -line.price_subtotal,
                    'price_subtotal_incl': -line.price_subtotal_incl,
                    'pack_lot_ids': PosOrderLineLot,
                    })
            refund_orders |= refund_order
        
            #for p in self.payment_ids:
            #    refund_orders.add_payment({
            #        'name': _('return'),
            #        'pos_order_id': refund_orders.id,
            #        'amount': -p.amount,
            #        'payment_date': fields.Date.context_today(self),
            #        'payment_method_id': p.payment_method_id.id,
            #    })

            #refund_orders.action_pos_order_paid()
            #refund_orders.action_pos_order_invoice()

            refund_orders.nota_credito_creada = True
            order.nota_credito_creada = True

        return {
            'name': _('Return Products'),
            'view_mode': 'form',
            'res_model': 'pos.order',
            'res_id': refund_orders.ids[0],
            'view_id': False,
            'context': self.env.context,
            'type': 'ir.actions.act_window',
            'target': 'current',
        }

class PosOrderLine(models.Model):
    _inherit = "pos.order.line"

    # Compone un bug que no calcula los impuestos cuando se agrega una nueva
    # linea desde la interfaz normal de Odoo.
    tax_ids = fields.Many2many('account.tax', string='Taxes', readonly=False)
