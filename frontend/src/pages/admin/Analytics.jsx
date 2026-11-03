import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ANALYTICS } from '../../data/seed'
import { CardHead, Stat } from '../../components/ui'
import { Gauge, ShieldCheck, Timer, MessageCircleQuestion } from 'lucide-react'

const axis = { fontSize: 12, fill: '#8592a8' }
export default function Analytics() {
  const a = ANALYTICS
  return (
    <>
      <div className="page-head"><div><h1>Analytics</h1><p>How well the assistant answers, and how often it hands over to staff.</p></div></div>
      <div className="grid g4">
        <Stat icon={MessageCircleQuestion} value="1,482" label="Questions this month" />
        <Stat icon={Gauge} tone="green" value="84%" label="Answered with citations" />
        <Stat icon={ShieldCheck} tone="purple" value="1.8%" label="Unsupported claims caught" />
        <Stat icon={Timer} tone="orange" value="3.2 h" label="Median staff reply time" />
      </div>
      <div className="grid g2" style={{ marginTop: 18 }}>
        <div className="card"><CardHead title="Escalation rate by week" /><p className="small muted" style={{ marginTop: -8, marginBottom: 8 }}>Falls as approved staff answers join the knowledge base.</p>
          <div style={{ height: 250 }}><ResponsiveContainer><AreaChart data={a.escalation} margin={{ left: -18, right: 8 }}>
            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d5bff" stopOpacity={.3} /><stop offset="100%" stopColor="#2d5bff" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#e5eaf4" /><XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, 'Escalated']} /><Area type="monotone" dataKey="rate" stroke="#2d5bff" strokeWidth={3} fill="url(#g)" /></AreaChart></ResponsiveContainer></div></div>
        <div className="card"><CardHead title="Questions per day" />
          <div style={{ height: 275 }}><ResponsiveContainer><BarChart data={a.volume} margin={{ left: -18, right: 8 }}>
            <CartesianGrid vertical={false} stroke="#e5eaf4" /><XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} />
            <Tooltip /><Legend iconType="circle" /><Bar dataKey="answered" name="Answered by AI" stackId="a" fill="#2d5bff" radius={[0, 0, 4, 4]} /><Bar dataKey="escalated" name="Escalated" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><CardHead title="Tickets by severity" />
          <div style={{ height: 240 }}><ResponsiveContainer><PieChart><Pie data={a.severity} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>{a.severity.map((s) => <Cell key={s.name} fill={s.color} />)}</Pie><Tooltip /><Legend iconType="circle" /></PieChart></ResponsiveContainer></div></div>
        <div className="card"><CardHead title="Most asked topics" />
          <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={a.topics} layout="vertical" margin={{ left: 20, right: 8 }}>
            <CartesianGrid horizontal={false} stroke="#e5eaf4" /><XAxis type="number" tick={axis} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="topic" tick={axis} width={110} axisLine={false} tickLine={false} />
            <Tooltip /><Bar dataKey="count" name="Questions" fill="#5b4bff" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></div>
      </div>
      <p className="small faint" style={{ marginTop: 14 }}>Sample figures for the demo. They connect to the evaluation harness metrics once the API is live.</p>
    </>
  )
}
