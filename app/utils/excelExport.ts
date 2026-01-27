import ExcelJS from 'exceljs'
import { showSuccess, showError } from './toast'

/**
 * Get current date in Hebrew format
 */
function getHebrewDate(): string {
  return new Date().toLocaleDateString('he-IL')
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('he-IL').format(num)
}

/**
 * Export budget data to beautifully styled Excel
 */
export async function exportBudgetToExcel(
  categories: any[],
  totals: any
): Promise<void> {
  try {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('תקציב ורווחיות', {
      views: [{ rightToLeft: true }]
    })

    // Define columns
    worksheet.columns = [
      { header: 'קטגוריה', key: 'category', width: 25 },
      { header: 'ערך חוזה (₪)', key: 'contract', width: 18 },
      { header: 'הוצא בפועל (₪)', key: 'expenses', width: 18 },
      { header: 'קיבל מלקוח (₪)', key: 'income', width: 18 },
      { header: 'רווח צפוי (₪)', key: 'profit', width: 18 },
      { header: 'אחוז ביצוע', key: 'percentage', width: 15 }
    ]

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.height = 30
    headerRow.font = { 
      name: 'Arial',
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' }
    }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' } // Blue
    }
    headerRow.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    }
    headerRow.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }

    // Add data rows
    categories.forEach((cat, index) => {
      const percentage = Math.round((cat.actual_expenses / cat.contract_amount) * 100)
      
      const row = worksheet.addRow({
        category: cat.category_name,
        contract: cat.contract_amount,
        expenses: cat.actual_expenses,
        income: cat.received_income,
        profit: cat.expected_profit,
        percentage: percentage
      })

      // Style data rows
      row.height = 25
      row.font = { name: 'Arial', size: 11 }
      row.alignment = { vertical: 'middle', horizontal: 'right' }

      // Zebra striping
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' } // Light gray
        }
      }

      // Color code profit
      const profitCell = row.getCell(5)
      if (cat.expected_profit >= 0) {
        profitCell.font = { name: 'Arial', size: 11, color: { argb: 'FF008000' }, bold: true } // Green
      } else {
        profitCell.font = { name: 'Arial', size: 11, color: { argb: 'FFFF0000' }, bold: true } // Red
      }

      // Color code percentage
      const percentageCell = row.getCell(6)
      if (percentage > 100) {
        percentageCell.font = { name: 'Arial', size: 11, color: { argb: 'FFFF0000' }, bold: true } // Red - over budget
      } else if (percentage >= 85) {
        percentageCell.font = { name: 'Arial', size: 11, color: { argb: 'FFFF8C00' }, bold: true } // Orange - warning
      } else {
        percentageCell.font = { name: 'Arial', size: 11, color: { argb: 'FF008000' } } // Green - good
      }

      // Add borders
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        }
      })

      // Format numbers with commas
      row.getCell(2).numFmt = '#,##0'
      row.getCell(3).numFmt = '#,##0'
      row.getCell(4).numFmt = '#,##0'
      row.getCell(5).numFmt = '#,##0'
      row.getCell(6).numFmt = '0"%"'
    })

    // Add empty row
    worksheet.addRow({})

    // Add totals row
    const totalPercentage = Math.round(totals.percentageComplete)
    const totalsRow = worksheet.addRow({
      category: '*** סה״כ ***',
      contract: totals.totalContract,
      expenses: totals.totalExpenses,
      income: totals.totalIncome,
      profit: totals.expectedProfit,
      percentage: totalPercentage
    })

    // Style totals row
    totalsRow.height = 30
    totalsRow.font = { 
      name: 'Arial',
      size: 12, 
      bold: true 
    }
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' } // Yellow
    }
    totalsRow.alignment = { 
      vertical: 'middle', 
      horizontal: 'right' 
    }

    // Color code total profit
    const totalProfitCell = totalsRow.getCell(5)
    if (totals.expectedProfit >= 0) {
      totalProfitCell.font = { name: 'Arial', size: 12, color: { argb: 'FF008000' }, bold: true }
    } else {
      totalProfitCell.font = { name: 'Arial', size: 12, color: { argb: 'FFFF0000' }, bold: true }
    }

    // Add borders to totals
    totalsRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    })

    // Format totals numbers
    totalsRow.getCell(2).numFmt = '#,##0'
    totalsRow.getCell(3).numFmt = '#,##0'
    totalsRow.getCell(4).numFmt = '#,##0'
    totalsRow.getCell(5).numFmt = '#,##0'
    totalsRow.getCell(6).numFmt = '0"%"'

    // Add metadata
    workbook.creator = 'Projekta'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.lastModifiedBy = 'Projekta'

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `תקציב_${getHebrewDate()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    showSuccess('✅ קובץ האקסל ירד בהצלחה!')
  } catch (error) {
    console.error('❌ שגיאה בייצוא תקציב:', error)
    showError('שגיאה בייצוא הקובץ. אנא נסה שוב.')
  }
}

/**
 * Export cash flow transactions to beautifully styled Excel
 */
export async function exportCashFlowToExcel(
  transactions: any[]
): Promise<void> {
  try {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('תזרים מזומנים', {
      views: [{ rightToLeft: true }]
    })

    // Define columns
    worksheet.columns = [
      { header: 'תאריך', key: 'date', width: 15 },
      { header: 'סוג', key: 'type', width: 12 },
      { header: 'תיאור', key: 'description', width: 35 },
      { header: 'קטגוריה', key: 'category', width: 20 },
      { header: 'סכום (₪)', key: 'amount', width: 18 },
      { header: 'סטטוס', key: 'status', width: 18 }
    ]

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.height = 30
    headerRow.font = { 
      name: 'Arial',
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' }
    }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' } // Blue
    }
    headerRow.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    }
    headerRow.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }

    // Add data rows
    transactions.forEach((trans, index) => {
      const row = worksheet.addRow({
        date: new Date(trans.date).toLocaleDateString('he-IL'),
        type: trans.type === 'income' ? 'הכנסה' : 'הוצאה',
        description: trans.description,
        category: trans.category ? trans.category.name : 'ללא קטגוריה',
        amount: trans.amount,
        status: trans.status === 'paid' ? 'שולם' : 'ממתין לתשלום'
      })

      // Style data rows
      row.height = 25
      row.font = { name: 'Arial', size: 11 }
      row.alignment = { vertical: 'middle', horizontal: 'right' }

      // Zebra striping
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        }
      }

      // Color code by type
      const typeCell = row.getCell(2)
      if (trans.type === 'income') {
        typeCell.font = { name: 'Arial', size: 11, color: { argb: 'FF008000' }, bold: true }
      } else {
        typeCell.font = { name: 'Arial', size: 11, color: { argb: 'FFFF0000' }, bold: true }
      }

      // Color code amount
      const amountCell = row.getCell(5)
      if (trans.type === 'income') {
        amountCell.font = { name: 'Arial', size: 11, color: { argb: 'FF008000' }, bold: true }
      } else {
        amountCell.font = { name: 'Arial', size: 11, color: { argb: 'FFFF0000' }, bold: true }
      }

      // Color code status
      const statusCell = row.getCell(6)
      if (trans.status === 'paid') {
        statusCell.font = { name: 'Arial', size: 11, color: { argb: 'FF008000' } }
      } else {
        statusCell.font = { name: 'Arial', size: 11, color: { argb: 'FFFF8C00' } }
      }

      // Add borders
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        }
      })

      // Format amount
      row.getCell(5).numFmt = '#,##0'
    })

    // Add summary section
    worksheet.addRow({})
    worksheet.addRow({})

    const summaryHeaderRow = worksheet.addRow({
      date: '',
      type: '',
      description: '*** סיכום ***',
      category: '',
      amount: '',
      status: ''
    })

    summaryHeaderRow.font = { name: 'Arial', size: 12, bold: true }
    summaryHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    }

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const balance = totalIncome - totalExpenses

    // Add income row
    const incomeRow = worksheet.addRow({
      date: '',
      type: '',
      description: 'סה״כ הכנסות',
      category: '',
      amount: totalIncome,
      status: ''
    })
    incomeRow.font = { name: 'Arial', size: 11, bold: true }
    incomeRow.getCell(5).font = { name: 'Arial', size: 11, color: { argb: 'FF008000' }, bold: true }
    incomeRow.getCell(5).numFmt = '#,##0'

    // Add expenses row
    const expensesRow = worksheet.addRow({
      date: '',
      type: '',
      description: 'סה״כ הוצאות',
      category: '',
      amount: totalExpenses,
      status: ''
    })
    expensesRow.font = { name: 'Arial', size: 11, bold: true }
    expensesRow.getCell(5).font = { name: 'Arial', size: 11, color: { argb: 'FFFF0000' }, bold: true }
    expensesRow.getCell(5).numFmt = '#,##0'

    // Add balance row
    const balanceRow = worksheet.addRow({
      date: '',
      type: '',
      description: 'יתרה',
      category: '',
      amount: balance,
      status: ''
    })
    balanceRow.height = 30
    balanceRow.font = { name: 'Arial', size: 12, bold: true }
    balanceRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB9C' }
    }
    const balanceAmountCell = balanceRow.getCell(5)
    balanceAmountCell.font = { 
      name: 'Arial', 
      size: 12, 
      color: { argb: balance >= 0 ? 'FF008000' : 'FFFF0000' }, 
      bold: true 
    }
    balanceAmountCell.numFmt = '#,##0'

    // Add metadata
    workbook.creator = 'Projekta'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.lastModifiedBy = 'Projekta'

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `תזרים_מזומנים_${getHebrewDate()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    showSuccess('✅ קובץ התזרים ירד בהצלחה!')
  } catch (error) {
    console.error('❌ שגיאה בייצוא תזרים:', error)
    showError('שגיאה בייצוא הקובץ. אנא נסה שוב.')
  }
}
