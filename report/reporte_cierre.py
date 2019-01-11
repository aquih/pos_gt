# -*- coding: utf-8 -*-

from odoo import api, models

class ReporteCierre(models.AbstractModel):
    _name = 'report.pos_gt.reporte_cierre'

    def subtotal_ventas(self, s):
        total = 0
        for o in s.order_ids:
            total += o.amount_total
        return total

    def subtotal_ingresos(self, s):
        total = 0
        for st in s.statement_ids:
            total += st.total_entry_encoding
        return total

    def lineas_ventas(self, docs):
        lineas = []
        for s in docs:
            for o in s.order_ids:
                lineas.append(o)
        return lineas

    def total_ventas(self, docs):
        total = 0
        for s in docs:
            for o in s.order_ids:
                total += o.amount_total
        return total

    def lineas_ingresos(self, docs):
        diarios = {}
        for s in docs:
            for st in s.statement_ids:
                if st.journal_id.id not in diarios:
                    diarios[st.journal_id.id] = {'diario': st.journal_id, 'balance_inicial': 0, 'total_ventas': 0, 'balance_final': 0, 'diferencia': 0}
                diarios[st.journal_id.id]['balance_inicial'] += st.balance_start
                diarios[st.journal_id.id]['total_ventas'] += st.total_entry_encoding
                diarios[st.journal_id.id]['balance_final'] += st.balance_end_real
                diarios[st.journal_id.id]['diferencia'] += st.difference
        return diarios.values()

    def total_ingresos(self, docs):
        total = 0
        for s in docs:
            for st in s.statement_ids:
                total += st.total_entry_encoding
        return total

    @api.model
    def _get_report_values(self, docids, data=None):
        return self.get_report_values(docids, data)

    @api.model
    def get_report_values(self, docids, data=None):
        self.model = 'pos.session'
        docs = self.env[self.model].browse(docids)

        return {
            'doc_ids': self.ids,
            'doc_model': self.model,
            'docs': docs,
            'subtotal_ventas': self.subtotal_ventas,
            'subtotal_ingresos': self.subtotal_ingresos,
            'lineas_ventas': self.lineas_ventas,
            'total_ventas': self.total_ventas,
            'lineas_ingresos': self.lineas_ingresos,
            'total_ingresos': self.total_ingresos,
        }
