# -*- encoding: utf-8 -*-

from odoo import models, fields, api, Command

class Users(models.Model):
    _inherit = 'res.users'

    default_pos_ids = fields.Many2many("pos.config", string="Punto de Venta por Defecto")
    default_location_ids = fields.Many2many("stock.location", compute='_compute_locations_and_analytics')
    default_analytic_account_ids = fields.Many2many("account.analytic.account", compute='_compute_locations_and_analytics')

    @api.depends('default_pos_ids')
    def _compute_locations_and_analytics(self):
        for u in self:
            u.default_location_ids = [Command.set([l.id for l in u.default_pos_ids.picking_type_id.default_location_src_id])]
            u.default_analytic_account_ids = [Command.set([a.id for a in u.default_pos_ids.analytic_account_id])]