import { getGradient } from '@/helpers/getGradient'

export const data = {
  datasets: [
    {
      backgroundColor: function (context: { chart: any }) {
        const chart = context.chart
        const { ctx, chartArea } = chart

        if (!chartArea) return

        return getGradient(ctx, chartArea)
      }
    }
  ]
}

export const options = {
  responsive: true,
  maintainAspectRatio: true,
  barPercentage: 1.0,
  categoryPercentage: 1.0,
  scales: {
    x: {
      display: false
    },
    y: {
      display: false
    }
  }
}
