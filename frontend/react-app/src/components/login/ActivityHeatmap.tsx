import { useEffect, useRef, useMemo, type FC } from 'react'
import { motion } from 'motion/react'
import * as d3 from 'd3'

const AUCTIONS = ['Coil 304', 'Ti Sheet', 'Al Extr.', 'Cu Wire']
const MINUTES = 20

function generateMockData() {
  return AUCTIONS.map((name) =>
    Array.from({ length: MINUTES }, (_, t) => ({
      auction: name,
      minute: t,
      value: Math.max(0, Math.round(Math.random() * 12)),
    }))
  ).flat()
}

export const ActivityHeatmap: FC = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const data = useMemo(generateMockData, [])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const cellSize = 20
    const gap = 3
    const paddingLeft = 52
    const paddingTop = 8

    const width = paddingLeft + MINUTES * (cellSize + gap)
    const height = paddingTop + AUCTIONS.length * (cellSize + gap) + 24

    svg.attr('width', width).attr('height', height)

    const colorScale = d3.scaleSequential()
      .domain([0, 12])
      .interpolator(d3.interpolate('#431407', '#F97316'))

    const tooltip = d3.select('body')
      .selectAll('.heatmap-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'heatmap-tooltip')
      .style('position', 'fixed')
      .style('background', '#27272A')
      .style('color', '#FAFAFA')
      .style('font-size', '11px')
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('z-index', '9999')

    // Axis labels
    svg.append('text')
      .text('20 min ago')
      .attr('x', paddingLeft)
      .attr('y', height - 4)
      .attr('fill', '#52525B')
      .attr('font-size', 10)

    svg.append('text')
      .text('now')
      .attr('x', width - 24)
      .attr('y', height - 4)
      .attr('fill', '#52525B')
      .attr('font-size', 10)

    AUCTIONS.forEach((auctionName, row) => {
      svg.append('text')
        .text(auctionName)
        .attr('x', paddingLeft - 4)
        .attr('y', paddingTop + row * (cellSize + gap) + cellSize / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#71717A')
        .attr('font-size', 10)
    })

    const cells = svg.selectAll('rect.cell')
      .data(data)
      .join('rect')
      .attr('class', 'cell')
      .attr('x', d => paddingLeft + d.minute * (cellSize + gap))
      .attr('y', d => paddingTop + AUCTIONS.indexOf(d.auction) * (cellSize + gap))
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', 2)
      .attr('fill', '#27272A')

    cells.transition()
      .delay(d => d.minute * 30)
      .duration(400)
      .attr('fill', d => d.value > 0 ? colorScale(d.value) : '#27272A')

    cells
      .on('mouseover', function (_event, d) {
        tooltip
          .style('opacity', '1')
          .html(`${d.auction} · ${MINUTES - d.minute}m ago · ${d.value} bids`)
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 28}px`)
      })
      .on('mouseout', function () {
        tooltip.style('opacity', '0')
      })
  }, [data])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="overflow-x-auto"
    >
      <svg ref={svgRef} />
    </motion.div>
  )
}
