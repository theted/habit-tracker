export const CHART_COLORS = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
} as const

interface ChartArea {
  right: number
  left: number
  bottom: number
  top: number
}

interface Gradient {
  addColorStop(position: number, color: string): void
}

interface Context2D {
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): Gradient
}

export function getGradient(ctx: Context2D, chartArea: ChartArea): Gradient {
  let width: number, height: number
  let gradient: Gradient | undefined

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
