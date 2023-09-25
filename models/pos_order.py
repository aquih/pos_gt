# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError
from odoo.osv.expression import AND
import logging

class PosOrder(models.Model):
    _inherit = 'pos.order'

    def _prepare_invoice_line(self, order_line):
        res = super(PosOrder, self)._prepare_invoice_line(order_line)
        if order_line.order_id.config_id.analytic_account_id:
            res['analytic_distribution'] = dict([(str(order_line.order_id.config_id.analytic_account_id.id), 100),])
        return res

    def _prepare_invoice_vals(self):
        res = super(PosOrder, self)._prepare_invoice_vals()
        if self.amount_total < 0 and self.config_id.diario_nota_credito_id:
            res['journal_id'] = self.config_id.diario_nota_credito_id.id
        return res
    
    def _create_order_picking(self):
        self = self.with_context(analytic_account_id=self.config_id.analytic_account_id)
        super(PosOrder, self)._create_order_picking()
            
    @api.model
    def search_paid_order_ids(self, config_id, domain, limit, offset):
        """Search for 'paid' orders that satisfy the given domain, limit and offset."""
        default_domain = ['!', '|', ('state', '=', 'draft'), ('state', '=', 'cancelled')]
        real_domain = AND([domain, default_domain])
        ids = self.search(AND([domain, default_domain]), limit=limit, offset=offset).ids
        totalCount = self.search_count(real_domain)
        return {'ids': ids, 'totalCount': totalCount}

        return res

class PosSession(models.Model):
    _inherit = 'pos.session'
    
    def _pos_ui_models_to_load(self):
        result = super()._pos_ui_models_to_load()
        new_model = 'pos_gt.extra'
        if new_model not in result:
            result.append(new_model)

        return result
    
    def _pos_data_process(self, loaded_data):
        super()._pos_data_process(loaded_data)
        loaded_data['diario_facturacion'] = { 'nombre': self.config_id.invoice_journal_id.direccion.name, 'direccion': self.config_id.invoice_journal_id.direccion.street }
    
    def _loader_params_product_product(self):
        result = super(PosSession, self)._loader_params_product_product()
        result['search_params']['fields'].append('extras_id')
        return result
        
    def _loader_params_res_partner(self):
        result = super(PosSession, self)._loader_params_res_partner()
        result['search_params']['fields'].append('ref')
        return result

    def _loader_params_pos_gt_extra(self):
        return {'search_params': {'domain': ['|', ('company_id', '=', False), ('company_id', '=', self.config_id.company_id.id)], 'fields': ['name', 'sequence', 'type'], 'load': False}}
    
    def _get_pos_ui_pos_gt_extra(self, params):
        extras = self.env['pos_gt.extra'].search_read(**params['search_params'])
        extras_por_id = {}
        for e in extras:
            e['lineas'] = [];
            extras_por_id[e['id']] = e

        lineas = self.env['pos_gt.extra.line'].search_read(domain=['|', ('extra_id.company_id', '=', False), ('extra_id.company_id', '=', self.config_id.company_id.id)], fields=['name', 'extra_id', 'product_id', 'qty', 'price_extra'], load=False)
        for l in lineas:
            extras_por_id[l['extra_id']]['lineas'].append(l)
        
        return extras
        
    def _create_picking_at_end_of_session(self):
        self = self.with_context(analytic_account_id=self.config_id.analytic_account_id)
        super(PosSession, self)._create_picking_at_end_of_session()
