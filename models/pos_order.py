# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _
from odoo.exceptions import UserError
import logging

class PosOrder(models.Model):
    _inherit = 'pos.order'

    employee_id = fields.Many2one('hr.employee','Empleado')
    nota_credito_creada = fields.Boolean('Nota credito creada', default=False)

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

    # asignamos en el pedido devuelto las series que vienen del pedido original
    # para que en el envío de devolución las asigne tambien
    def asignar_series(self, pedido_devuelto, producto_id, numero_serie):
        pack_lot_copy_ids = True
        for linea in pedido_devuelto.lines:
            if linea.product_id == producto_id:
                logging.warn(product_id)
                logging.warn(numero_serie)
                pack_lot_copy_ids = self.env['pos.pack.operation.lot'].create({
                    'pos_order_line_id': linea.id,
                    'lot_name': numero_serie
                })
        return pack_lot_copy_ids

    @api.multi
    def nota_credito(self):
        if self.nota_credito_creada:
            raise UserError('La nota de crédito ya ha sido creada para este pedido.')

        if self.config_id.diario_nota_credito_id:
            accion = self.refund()
            nuevo = self.env['pos.order'].browse(accion['res_id'])
            for p in self.statement_ids:
                nuevo.add_payment({
                    'amount': -p.amount,
                    'payment_date': fields.Date.context_today(self),
                    'payment_name': _('return'),
                    'journal': p.journal_id.id,
                })

            # for linea in self.lines:
            #     if linea.pack_lot_ids:
            #         for pack_linea in linea.pack_lot_ids:
            #             self.asignar_series(nuevo,pack_linea.product_id,pack_linea.lot_name)

            for i in range(0, len(self.lines)):
                linea_viejo = self.lines[i]
                linea_nuevo = nuevo.lines[i]

                for pack_linea in linea_viejo.pack_lot_ids:
                    self.env['pos.pack.operation.lot'].create({
                        'pos_order_line_id': linea_nuevo.id,
                        'lot_name': pack_linea.lot_name
                    })

            nuevo.action_pos_order_paid()
            nuevo.action_pos_order_invoice()
            nuevo.invoice_id.numero_viejo = self.invoice_id.name
            nuevo.invoice_id.comment = 'Ajuste '+self.invoice_id.name
            if 'factura_original_id' in self.env['account.invoice']._fields:
                nuevo.invoice_id.factura_original_id= self.invoice_id.id
            nuevo.invoice_id.sudo().action_invoice_open()
            nuevo.account_move = nuevo.invoice_id.move_id

            self.nota_credito_creada = True

            return accion

class PosOrderLine(models.Model):
    _inherit = "pos.order.line"

    note = fields.Char('Nota')
