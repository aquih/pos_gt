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
    opcion_recetas = fields.Boolean(string="Opción Para Ver Recetas")
    opcion_dos_por_uno = fields.Boolean(string="Opción 2x1")
    productos_ids = fields.Many2many('product.product',relation="productos_ids_rel",string='Productos 2x1')
    opcion_empleado = fields.Boolean(string="Opción Para Seleccionar Empleado")
    diario_nota_credito_id = fields.Many2one("account.journal", string="Diario para Nota de Crédito")
