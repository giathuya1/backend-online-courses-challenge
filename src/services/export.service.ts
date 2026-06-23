// src/services/export.service.ts
// Builds .xlsx workbooks in-memory and hands back a Buffer — the
// controller just sets headers and res.send()s it. Keeping ExcelJS
// usage isolated here means swapping libraries later (or moving to a
// streaming writer for very large datasets) only touches this file.
//
// npm install exceljs

import ExcelJS from 'exceljs';
import { StatsRepository } from '../repositories/stats.repository';

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
}

export const ExportService = {
  async exportStatsToExcel(): Promise<Buffer> {
    const [courses, classes, enrollmentsByStatus] = await Promise.all([
      StatsRepository.getCourseStats(),
      StatsRepository.getClassStats(),
      StatsRepository.getEnrollmentStatusBreakdown(),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Online Learning System';
    workbook.created = new Date();

    // ── Sheet 1: Courses ────────────────────────────────────────────────
    const coursesSheet = workbook.addWorksheet('Courses');
    coursesSheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Instructor', key: 'instructor', width: 28 },
      { header: 'Classes', key: 'classCount', width: 12 },
      { header: 'Total Enrolled', key: 'enrolledCount', width: 16 },
    ];
    styleHeaderRow(coursesSheet.getRow(1));
    courses.forEach(c => coursesSheet.addRow(c));
    coursesSheet.autoFilter = { from: 'A1', to: 'F1' };

    // ── Sheet 2: Classes ───────────────────────────────────────────────
    const classesSheet = workbook.addWorksheet('Classes');
    classesSheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Class Name', key: 'class_name', width: 24 },
      { header: 'Course', key: 'courseTitle', width: 32 },
      { header: 'Instructor', key: 'instructor', width: 28 },
      { header: 'Start Date', key: 'start_date', width: 14 },
      { header: 'End Date', key: 'end_date', width: 14 },
      { header: 'Enrolled / Max', key: 'capacity', width: 16 },
    ];
    styleHeaderRow(classesSheet.getRow(1));
    classes.forEach(c => classesSheet.addRow(c));
    classesSheet.autoFilter = { from: 'A1', to: 'G1' };

    // ── Sheet 3: Enrollment status summary ───────────────────────────────
    const summarySheet = workbook.addWorksheet('Enrollment Summary');
    summarySheet.columns = [
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Count', key: 'count', width: 12 },
    ];
    styleHeaderRow(summarySheet.getRow(1));
    enrollmentsByStatus.forEach(r => summarySheet.addRow(r));

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },
};
