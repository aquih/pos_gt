# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _
import odoo.addons.decimal_precision as dp

class PosGTExtra(models.Model):
    _name = "pos_gt.extra"

    name = fields.Char(string="Nombre", required=True)
    company_id = fields.Many2one("res.company", string="Company", required=True, default=lambda self: self.env.user.company_id)
    type = fields.Selection(default="fixed", string="Tipo", required=True, selection=[("fixed", "No se puede cambiar cantidad"), ("variable", "Si se puede cambiar cantidad")])
    products_id = fields.One2many("pos_gt.extra.line", "extra_id", string="Lineas")

class PosGTExtraLine(models.Model):
    _name = "pos_gt.extra.line"

    name = fields.Char(string="Nombre", required=True)
    extra_id = fields.Many2one("pos_gt.extra", string="Extra", required=True)
    product_id = fields.Many2one("product.product", string="Producto", required=True, domain=[('available_in_pos', '=', True)])
    qty = fields.Float("Cantidad", digits=dp.get_precision('Product Unit of Measure'), default=1)
    price_extra = fields.Monetary("Precio Extra", currency_field="company_currency_id", default=0.0)
    company_currency_id = fields.Many2one("res.currency", related="extra_id.company_id.currency_id", string="Divisa", readonly=True, store=True)

    @api.onchange('product_id') # if these fields are changed, call method
    def product_id_change(self):
        self.name = self.product_id.name

class ProductTemplate(models.Model):
    _inherit = "product.template"

    extras_id = fields.Many2many("pos_gt.extra", string="Extras")
