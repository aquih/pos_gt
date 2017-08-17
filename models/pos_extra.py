# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _

class PosGTExtra(models.Model):
    _name = "pos_gt.extra"

    name = fields.Char(string="Nombre", required=True)
    company_id = fields.Many2one("res.company", string="Company", required=True, default=lambda self: self.env.user.company_id)
    type = fields.Selection(default="one", string="Tipo", required=True, selection=[("one", "Solo Uno"), ("one_or_more", "Uno o Mas"), ("zero_or_more", "Cero o Mas")])
    operation = fields.Selection(default="add", string="Operación", required=True, selection=[("add", "Agregar"), ("remove", "Quitar")])
    products_id = fields.One2many("pos_gt.extra.line", "extra_id", string="Lineas")

class PosGTExtraLine(models.Model):
    _name = "pos_gt.extra.line"

    name = fields.Char(string="Nombre", required=True)
    extra_id = fields.Many2one("pos_gt.extra", string="Extra", required=True)
    product_id = fields.Many2one("product.product", string="Producto", required=True, domain=[('available_in_pos', '=', True)])
    price_extra = fields.Monetary(default=0.0, currency_field="company_currency_id", string="Precio Extra")
    company_currency_id = fields.Many2one("res.currency", related="extra_id.company_id.currency_id", string="Divisa", readonly=True, store=True)

class ProductTemplate(models.Model):
    _inherit = "product.template"

    extras_id = fields.Many2many("pos_gt.extra", string="Extras")
