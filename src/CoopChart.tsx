"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, Area, ComposedChart, ErrorBar, Scatter, Label } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { diff: 0.05, solo: 0.75, coop: 0.72, soloError: [0.06, 0.06], coopError: [0.08, 0.08], range: [0.72, 0.75] },
  { diff: 0.25, solo: 0.58, coop: 0.30, soloError: [0.04, 0.04], coopError: [0.04, 0.04], range: [0.30, 0.58] },
  { diff: 0.35, solo: 0.45, coop: 0.18, soloError: [0.05, 0.05], coopError: [0.04, 0.04], range: [0.18, 0.45] },
  { diff: 0.45, solo: 0.42, coop: 0.20, soloError: [0.08, 0.08], coopError: [0.07, 0.07], range: [0.20, 0.42] },
  { diff: 0.55, solo: 0.35, coop: 0.11, soloError: [0.06, 0.06], coopError: [0.05, 0.05], range: [0.11, 0.35] },
  { diff: 0.65, solo: 0.28, coop: 0.13, soloError: [0.04, 0.04], coopError: [0.03, 0.03], range: [0.13, 0.28] },
  { diff: 0.75, solo: 0.18, coop: 0.12, soloError: [0.03, 0.03], coopError: [0.02, 0.02], range: [0.12, 0.18] },
  { diff: 0.85, solo: 0.10, coop: 0.05, soloError: [0.04, 0.04], coopError: [0.02, 0.02], range: [0.05, 0.10] },
  { diff: 0.95, solo: 0.05, coop: 0.05, soloError: [0.03, 0.03], coopError: [0.02, 0.02], range: [0.05, 0.05] },
]

const chartConfig = {
  solo: {
    label: "Solo: Agents work alone",
    color: "#2563eb", // blue-600
  },
  coop: {
    label: "Coop: Agents work together",
    color: "#000000",
  },
} satisfies ChartConfig

export function CoopChart() {
  return (
    <Card className="w-full h-full border-none shadow-none">
  {/* Header removed to match raw figure look more closely if needed, keeping for context */}
      <CardContent className="flex flex-col items-center">
        <ChartContainer config={chartConfig} className="aspect-auto h-[400px] w-full">
          <ComposedChart
            data={chartData}
            margin={{
              top: 30, // Increased to fit point labels
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <defs>
              <linearGradient id="fillGap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-solo)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-solo)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={true} horizontal={true} strokeDasharray="3 3" stroke="#e5e5e5" />
            
            <XAxis
              dataKey="diff"
              type="number"
              domain={[0, 1]}
              tickCount={6}
              tickLine={false}
              axisLine={true}
              height={80}
            >
              <Label 
                value="Relative Difficulty" 
                position="insideBottom" 
                offset={0}
                fill="#374151" 
                fontSize={14} 
                fontWeight={500}
              />
            </XAxis>
            <YAxis
              domain={[0, 1]}
              tickCount={6}
              axisLine={true}
              tickLine={false}
              hide
            />
            
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />

            {/* Area for Gap: Fill between Coop and Solo */}
            <Area
              dataKey="range"
              type="monotone"
              fill="url(#fillGap)"
              stroke="none"
              activeDot={false}
              isAnimationActive={false}
            />

            {/* Dashed Line for Solo */}
            <Line
              dataKey="solo"
              type="monotone"
              stroke="var(--color-solo)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 5, fill: "var(--color-solo)", strokeWidth: 0, opacity: 0.9 }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
              label={({ x, y, value }) => (
                <text x={x} y={y} dy={-15} fill={chartConfig.solo.color} fontSize={12} textAnchor="middle" fontWeight="bold">
                  {Math.round(value * 100)}%
                </text>
              )}
            >
                <ErrorBar dataKey="soloError" direction="y" width={4} strokeWidth={2} stroke="var(--color-solo)" opacity={0.6} />
            </Line>

            {/* Solid Line for Coop */}
            <Line
              dataKey="coop"
              type="monotone"
              stroke="var(--color-coop)"
              strokeWidth={2}
              dot={{ r: 5, fill: "var(--color-coop)", strokeWidth: 0, opacity: 0.9 }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
              label={({ x, y, value }) => (
                <text x={x} y={y} dy={20} fill={chartConfig.coop.color} fontSize={12} textAnchor="middle" fontWeight="bold">
                  {Math.round(value * 100)}%
                </text>
              )}
            >
                <ErrorBar dataKey="coopError" direction="y" width={4} strokeWidth={2} stroke="var(--color-coop)" opacity={0.6} />    
            </Line>

            <ChartLegend verticalAlign="top" align="right" content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
        <p className="text-sm text-gray-500 mt-2 text-center">
            The coordination gap is largest for medium-difficulty tasks.
        </p>
      </CardContent>
    </Card>
  )
}
