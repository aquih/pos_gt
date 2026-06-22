# -*- encoding: utf-8 -*-

import logging

from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError

class PosSession(models.Model):
    _inherit = 'pos.session'

    def _prepare_account_bank_statement_line_vals(self, session, sign, amount, reason, partner_id, extras):
        vals = super()._prepare_account_bank_statement_line_vals(session, sign, amount, reason, partner_id, extras)
        vals['ref'] = reason
        
        return vals