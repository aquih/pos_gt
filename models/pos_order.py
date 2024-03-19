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

class PosSession(models.Model):
    _inherit = 'pos.session'
    
    def _pos_data_process(self, loaded_data):
        super()._pos_data_process(loaded_data)
        loaded_data['diario_facturacion'] = { 'nombre': self.config_id.invoice_journal_id.direccion.name, 'direccion': self.config_id.invoice_journal_id.direccion.street }
            
    def _loader_params_res_partner(self):
        result = super(PosSession, self)._loader_params_res_partner()
        result['search_params']['fields'].append('ref')
        return result

    def _create_picking_at_end_of_session(self):
        self = self.with_context(analytic_account_id=self.config_id.analytic_account_id)
        super(PosSession, self)._create_picking_at_end_of_session()
