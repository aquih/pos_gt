# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _
import logging

class PosOrder(models.Model):
    _inherit = 'pos.order'

    def _prepare_analytic_account(self, line):
        if line.order_id.config_id.analytic_account_id:
            return line.order_id.config_id.analytic_account_id.id
        else:
            return False

    def _force_picking_done(self, picking):
        if self.config_id.analytic_account_id:
            picking.cuenta_analitica_id = self.config_id.analytic_account_id
        res = super(PosOrder, self)._force_picking_done(picking)

    def guardar_pedido_session_alterna(self,orden,orderline):
        orden_id = self.env['pos.order'].create(orden[0])
        for linea in orderline[0]:
            linea['order_id'] = orden_id.id
            linea_id = self.env['pos.order.line'].create(linea)
        return False

    def actualizar_pedido(self,orden_id,orden,orderline,restaurante):
        orders = self.env['pos.order'].search([['id', '=', orden_id]])
        logging.warn(restaurante)
        if restaurante[0]:
            for order in orders: 
                order.write({'partner_id': orden[0]['partner_id'], 'user_id':orden[0]['user_id'],'customer_count': orden[0]['customer_count']})
        else:
            for order in orders: 
                order.write({'partner_id': orden[0]['partner_id'], 'user_id':orden[0]['user_id']})            
        lineas = self.env['pos.order.line'].search([['order_id', 'in', orden_id]])
        lineas.unlink()
        for linea in orderline[0]:
            linea['order_id'] = orden_id[0]
            linea_id = self.env['pos.order.line'].create(linea)
        return True

    def guardar_pedido(self,ordenes,orderlines,sesion):
        ordenes_a_eliminar = []
        orden_id = 0
        for orden in ordenes:
            ordenes_a_eliminar.append(orden['id'])
            order = {
                'session_id': sesion[0],
                'partner_id': orden['partner_id'][0],
                'table_id': orden['table_id'][0],
                'customer_count': orden['customer_count']
            }
            orden_id = self.env['pos.order'].create(order)
            for linea in orderlines[0]:
                order_line = {
                    'order_id': orden_id.id,
                    'product_id': linea['product_id'][0],
                    'qty': linea['qty'],
                    'discount': linea['discount'],
                    'price_unit': linea['price_unit']
                }
                linea_id = self.env['pos.order.line'].create(order_line)
        ordenes = self.env['pos.order'].search([['id','in',ordenes_a_eliminar]])
        ordenes.unlink()
        return True

    def unlink_order(self,order_id):
        orden = self.env['pos.order'].search([['id','=',order_id]])
        orden.unlink()
        return True