import type { ChartArea } from 'chart.js'

export const CHART_COLORS = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
} as const

let width: number | undefined
let height: number | undefined
let gradient: CanvasGradient | undefined

export function getGradient(ctx: CanvasRenderingContext2D, chartArea: ChartArea): CanvasGradient {
  const chartWidth = chartArea.right - chartArea.left
  const chartHeight = chartArea.bottom - chartArea.top

  if (!gradient || width !== chartWidth || height !== chartHeight) {
    width = chartWidth
    height = chartHeight
    gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
    gradient.addColorStop(0, CHART_COLORS.blue)
    gradient.addColorStop(0.5, CHART_COLORS.yellow)
    gradient.addColorStop(1, CHART_COLORS.red)
  }

  return gradient
}
