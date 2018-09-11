# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _

class PosConfig(models.Model):
    _inherit = 'pos.config'

    allow_discount = fields.Boolean(string="Permitir Descuentos")
    allow_price_change = fields.Boolean(string="Permitir Cambiar Precio")
    ask_tag_number = fields.Boolean(string="Pedir Etiqueta")
    takeout_option = fields.Boolean(string="Opción Para Llevar")
    default_client_id = fields.Many2one("res.partner", string="Cliente CF")
    analytic_account_id = fields.Many2one("account.analytic.account", string="Cuenta Analítica")
    save_order_option = fields.Boolean(string="Opción para gurdar ventas")
    load_order_option = fields.Boolean(string="Opción para cargar ventas")
    load_order_session_option = fields.Boolean(string="Opción para cargar sesion")
    session_save_order = fields.Many2one('pos.session', string="Sesión para guardar pedidos")
    opcion_recetas = fields.Boolean(string="Opción Para Ver Recetas")
    opcion_pedidos_vendedor = fields.Boolean(string="Solo cargar pedidos del vendedor")