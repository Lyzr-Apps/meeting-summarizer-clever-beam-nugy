'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { FiCalendar, FiClock, FiUsers, FiHash, FiSend, FiEdit2, FiCheck, FiAlertCircle, FiSearch, FiChevronRight, FiChevronDown, FiArrowLeft, FiSettings, FiGrid, FiList } from 'react-icons/fi'
import { HiOutlineSparkles, HiOutlineClipboardCheck, HiOutlineLightBulb, HiOutlineDocumentText } from 'react-icons/hi'
import { BsSlack, BsCalendar3, BsCheckCircleFill } from 'react-icons/bs'

// ============================================================
// CONSTANTS
// ============================================================

const AGENT_IDS = {
  coordinator: '6998291fad21b9c50a06f80a',
  calendarData: '69982901ad21b9c50a06f7fe',
  slackContext: '69982901f71d44b61c7dd15b',
  slackPublisher: '6998290e9267270c12d34f0a',
}

const AGENTS_INFO = [
  { id: AGENT_IDS.coordinator, name: 'Meeting Summary Coordinator', role: 'Manager - orchestrates summary generation' },
  { id: AGENT_IDS.calendarData, name: 'Calendar Data Agent', role: 'Sub-Agent - fetches calendar event data' },
  { id: AGENT_IDS.slackContext, name: 'Slack Context Agent', role: 'Sub-Agent - gathers Slack conversation context' },
  { id: AGENT_IDS.slackPublisher, name: 'Slack Publisher Agent', role: 'Independent - posts summaries to Slack' },
]

// ============================================================
// TYPES
// ============================================================

interface Meeting {
  id: string
  title: string
  date: string
  time: string
  duration: string
  attendees: string[]
  description: string
  agenda: string
  slackChannel: string
}

interface ActionItem {
  task: string
  owner: string
  priority: string
  deadline: string
}

interface SummaryData {
  meeting_title: string
  meeting_date: string
  meeting_time: string
  attendees: string[]
  summary: string
  action_items: ActionItem[]
  key_decisions: string[]
  insights: string[]
}

interface HistoryEntry extends SummaryData {
  id: string
  status: 'posted' | 'draft'
  targetChannel: string
  postedAt: string
}

interface StatusMessage {
  type: 'success' | 'error' | 'info'
  text: string
}

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_MEETINGS: Meeting[] = [
  {
    id: '1',
    title: 'Sprint Planning - Q1 2026',
    date: '2026-02-20',
    time: '10:00 AM',
    duration: '1 hour',
    attendees: ['Sarah Chen', 'Mike Johnson', 'Priya Patel', 'Alex Kim'],
    description: 'Plan sprint objectives for Q1 2026. Review backlog items and assign priorities.',
    agenda: '1. Review Q4 retrospective\n2. Backlog grooming\n3. Sprint capacity planning\n4. Story point estimation',
    slackChannel: '#engineering',
  },
  {
    id: '2',
    title: 'Design Review - Dashboard Redesign',
    date: '2026-02-21',
    time: '2:00 PM',
    duration: '45 min',
    attendees: ['Lisa Wang', 'Tom Harris', 'Sarah Chen'],
    description: 'Review new dashboard mockups and gather feedback from the team.',
    agenda: '1. Present wireframes\n2. Color palette discussion\n3. Component library updates',
    slackChannel: '#design',
  },
  {
    id: '3',
    title: 'Backend Architecture Sync',
    date: '2026-02-22',
    time: '11:00 AM',
    duration: '30 min',
    attendees: ['Alex Kim', 'Jordan Lee', 'Mike Johnson'],
    description: 'Discuss migration from monolith to microservices architecture.',
    agenda: '1. Current architecture pain points\n2. Service boundary definitions\n3. Migration timeline',
    slackChannel: '#backend',
  },
  {
    id: '4',
    title: 'Product Roadmap Review',
    date: '2026-02-23',
    time: '3:00 PM',
    duration: '1.5 hours',
    attendees: ['Priya Patel', 'Lisa Wang', 'Sarah Chen', 'Tom Harris', 'Alex Kim'],
    description: 'Review and align on product roadmap for H1 2026.',
    agenda: '1. Q4 results review\n2. H1 priorities\n3. Feature requests pipeline\n4. Resource allocation',
    slackChannel: '#product',
  },
  {
    id: '5',
    title: 'Security Audit Kickoff',
    date: '2026-02-24',
    time: '9:00 AM',
    duration: '1 hour',
    attendees: ['Jordan Lee', 'Mike Johnson'],
    description: 'Kick off annual security audit process. Review scope and timeline.',
    agenda: '1. Audit scope definition\n2. Previous findings review\n3. Timeline and milestones',
    slackChannel: '#security',
  },
]

const SAMPLE_SUMMARY: SummaryData = {
  meeting_title: 'Sprint Planning - Q1 2026',
  meeting_date: '2026-02-20',
  meeting_time: '10:00 AM',
  attendees: ['Sarah Chen', 'Mike Johnson', 'Priya Patel', 'Alex Kim'],
  summary: 'The team reviewed Q4 retrospective findings and identified key areas for improvement in the upcoming sprint. Backlog was groomed with 23 items prioritized. Sprint capacity was confirmed at 42 story points across the team. Key focus areas include API performance optimization, dashboard redesign implementation, and security audit preparations.',
  action_items: [
    { task: 'Set up performance monitoring dashboard for API endpoints', owner: 'Alex Kim', priority: 'High', deadline: '2026-02-25' },
    { task: 'Complete wireframe review for dashboard redesign', owner: 'Sarah Chen', priority: 'High', deadline: '2026-02-22' },
    { task: 'Draft security audit scope document', owner: 'Mike Johnson', priority: 'Medium', deadline: '2026-02-27' },
    { task: 'Update component library with new design tokens', owner: 'Priya Patel', priority: 'Low', deadline: '2026-03-01' },
  ],
  key_decisions: [
    'Sprint velocity target set at 42 story points',
    'API performance optimization takes priority over new features',
    'Dashboard redesign will follow phased rollout approach',
    'Security audit will begin in parallel with sprint work',
  ],
  insights: [
    'Team capacity is 15% lower than last sprint due to PTO schedules',
    'Three critical bugs from Q4 need immediate attention before new feature work',
    'Stakeholder feedback suggests dashboard redesign should focus on data visualization improvements',
  ],
}

const SAMPLE_HISTORY: HistoryEntry[] = [
  {
    id: 'h1',
    meeting_title: 'Weekly Standup - Week 7',
    meeting_date: '2026-02-17',
    meeting_time: '9:00 AM',
    attendees: ['Sarah Chen', 'Mike Johnson', 'Alex Kim'],
    summary: 'Weekly sync covering sprint progress and blockers. Team is on track with 80% of planned stories completed.',
    action_items: [
      { task: 'Resolve CI/CD pipeline issue', owner: 'Alex Kim', priority: 'High', deadline: '2026-02-18' },
    ],
    key_decisions: ['Postpone feature flag migration to next sprint'],
    insights: ['Team morale is high after successful Q4 launch'],
    status: 'posted',
    targetChannel: '#engineering',
    postedAt: '2026-02-17T09:45:00Z',
  },
  {
    id: 'h2',
    meeting_title: 'Client Requirements Review',
    meeting_date: '2026-02-14',
    meeting_time: '2:00 PM',
    attendees: ['Priya Patel', 'Lisa Wang', 'Tom Harris'],
    summary: 'Reviewed updated requirements from the enterprise client. Several scope changes identified that need estimation.',
    action_items: [
      { task: 'Prepare updated SOW draft', owner: 'Priya Patel', priority: 'High', deadline: '2026-02-19' },
      { task: 'Technical feasibility analysis for new requirements', owner: 'Tom Harris', priority: 'Medium', deadline: '2026-02-20' },
    ],
    key_decisions: ['Accept scope change for Phase 2 features', 'Reject timeline compression request'],
    insights: ['Client is open to phased delivery if we can demonstrate early value'],
    status: 'posted',
    targetChannel: '#client-projects',
    postedAt: '2026-02-14T14:30:00Z',
  },
]

// ============================================================
// HELPERS
// ============================================================

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    case 'medium':
      return 'bg-[hsl(31,100%,65%)]/15 text-[hsl(31,100%,65%)] border-[hsl(31,100%,65%)]/30'
    case 'low':
      return 'bg-accent/15 text-accent border-accent/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

// ============================================================
// ERROR BOUNDARY
// ============================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatusBanner({ statusMessage }: { statusMessage: StatusMessage | null }) {
  if (!statusMessage) return null
  return (
    <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${statusMessage.type === 'success' ? 'bg-accent/10 text-accent border border-accent/20' : statusMessage.type === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
      {statusMessage.type === 'success' && <FiCheck className="w-4 h-4 shrink-0" />}
      {statusMessage.type === 'error' && <FiAlertCircle className="w-4 h-4 shrink-0" />}
      {statusMessage.type === 'info' && <HiOutlineSparkles className="w-4 h-4 shrink-0" />}
      {statusMessage.text}
    </div>
  )
}

function SidebarNav({
  currentView,
  setCurrentView,
  activeAgentId,
}: {
  currentView: string
  setCurrentView: (v: 'dashboard' | 'review' | 'history' | 'settings') => void
  activeAgentId: string | null
}) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: FiGrid },
    { id: 'history' as const, label: 'Meeting History', icon: FiList },
    { id: 'settings' as const, label: 'Settings', icon: FiSettings },
  ]

  return (
    <div className="w-64 shrink-0 bg-[hsl(231,18%,12%)] border-r border-[hsl(232,16%,22%)] flex flex-col h-screen">
      <div className="p-5 border-b border-[hsl(232,16%,22%)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <HiOutlineDocumentText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground leading-tight">Meeting Summary</h1>
            <p className="text-xs text-muted-foreground">Assistant</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id || (currentView === 'review' && item.id === 'dashboard')
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-[hsl(232,16%,20%)] text-foreground shadow-lg shadow-black/20' : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(232,16%,20%)]/50'}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-3 space-y-2 border-t border-[hsl(232,16%,22%)]">
        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connections</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/5 border border-accent/10">
          <BsCalendar3 className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs text-foreground">Google Calendar</span>
          <BsCheckCircleFill className="w-3 h-3 text-accent ml-auto" />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/5 border border-accent/10">
          <BsSlack className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs text-foreground">Slack</span>
          <BsCheckCircleFill className="w-3 h-3 text-accent ml-auto" />
        </div>
      </div>

      <div className="p-3 border-t border-[hsl(232,16%,22%)]">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agent Status</p>
          <div className="space-y-1.5">
            {AGENTS_INFO.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeAgentId === agent.id ? 'bg-accent animate-pulse' : 'bg-muted-foreground/40'}`} />
                <span className="text-xs text-muted-foreground truncate">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MeetingCard({
  meeting,
  isSelected,
  onClick,
}: {
  meeting: Meeting
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${isSelected ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/5' : 'bg-card border-border hover:border-primary/20 hover:bg-card/80 shadow-lg shadow-black/10'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-tight text-foreground leading-snug pr-2">{meeting.title}</h3>
        <FiChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-transform ${isSelected ? 'text-primary rotate-90' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <FiCalendar className="w-3 h-3" />
          {formatDate(meeting.date)}
        </span>
        <span className="flex items-center gap-1">
          <FiClock className="w-3 h-3" />
          {meeting.time}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <FiUsers className="w-3 h-3" />
          {meeting.attendees.length} attendees
        </span>
        <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-secondary/80">
          <FiHash className="w-2.5 h-2.5 mr-0.5" />
          {meeting.slackChannel.replace('#', '')}
        </Badge>
      </div>
    </button>
  )
}

function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-7 bg-muted rounded-lg w-3/4" />
        <div className="h-4 bg-muted rounded-lg w-1/2" />
      </div>
      <div className="h-px bg-muted" />
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded-lg w-1/4" />
        <div className="h-4 bg-muted rounded-lg w-full" />
        <div className="h-4 bg-muted rounded-lg w-5/6" />
        <div className="h-4 bg-muted rounded-lg w-4/5" />
      </div>
      <div className="h-px bg-muted" />
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded-lg w-1/3" />
        <div className="h-16 bg-muted rounded-xl w-full" />
        <div className="h-16 bg-muted rounded-xl w-full" />
        <div className="h-16 bg-muted rounded-xl w-full" />
      </div>
      <div className="h-px bg-muted" />
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded-lg w-1/4" />
        <div className="h-4 bg-muted rounded-lg w-full" />
        <div className="h-4 bg-muted rounded-lg w-3/4" />
      </div>
    </div>
  )
}

function DashboardView({
  meetings,
  selectedMeeting,
  setSelectedMeeting,
  slackChannel,
  setSlackChannel,
  onGenerateSummary,
  isGenerating,
  statusMessage,
  searchQuery,
  setSearchQuery,
  showCustomForm,
  setShowCustomForm,
  customMeeting,
  setCustomMeeting,
  onAddCustomMeeting,
}: {
  meetings: Meeting[]
  selectedMeeting: Meeting | null
  setSelectedMeeting: (m: Meeting) => void
  slackChannel: string
  setSlackChannel: (s: string) => void
  onGenerateSummary: () => void
  isGenerating: boolean
  statusMessage: StatusMessage | null
  searchQuery: string
  setSearchQuery: (s: string) => void
  showCustomForm: boolean
  setShowCustomForm: (b: boolean) => void
  customMeeting: Partial<Meeting>
  setCustomMeeting: React.Dispatch<React.SetStateAction<Partial<Meeting>>>
  onAddCustomMeeting: () => void
}) {
  const filteredMeetings = meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.attendees.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      {/* Left: Meeting List */}
      <div className="w-[340px] shrink-0 border-r border-border flex flex-col bg-background">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Upcoming Meetings</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowCustomForm(!showCustomForm)} className="h-8 text-xs gap-1 text-primary">
              <FiEdit2 className="w-3 h-3" />
              {showCustomForm ? 'Cancel' : 'New'}
            </Button>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-secondary/50 border-border rounded-xl"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {showCustomForm && (
              <Card className="border-primary/30 shadow-lg shadow-black/20 rounded-xl bg-card">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">New Meeting</p>
                  <Input
                    placeholder="Meeting title"
                    value={customMeeting.title || ''}
                    onChange={(e) => setCustomMeeting((prev) => ({ ...prev, title: e.target.value }))}
                    className="h-8 text-sm rounded-xl bg-secondary/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={customMeeting.date || ''}
                      onChange={(e) => setCustomMeeting((prev) => ({ ...prev, date: e.target.value }))}
                      className="h-8 text-sm rounded-xl bg-secondary/50"
                    />
                    <Input
                      placeholder="Time"
                      value={customMeeting.time || ''}
                      onChange={(e) => setCustomMeeting((prev) => ({ ...prev, time: e.target.value }))}
                      className="h-8 text-sm rounded-xl bg-secondary/50"
                    />
                  </div>
                  <Input
                    placeholder="Duration (e.g. 1 hour)"
                    value={customMeeting.duration || ''}
                    onChange={(e) => setCustomMeeting((prev) => ({ ...prev, duration: e.target.value }))}
                    className="h-8 text-sm rounded-xl bg-secondary/50"
                  />
                  <Input
                    placeholder="Attendees (comma separated)"
                    value={Array.isArray(customMeeting.attendees) ? customMeeting.attendees.join(', ') : ''}
                    onChange={(e) => setCustomMeeting((prev) => ({ ...prev, attendees: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
                    className="h-8 text-sm rounded-xl bg-secondary/50"
                  />
                  <Input
                    placeholder="Slack channel (e.g. #general)"
                    value={customMeeting.slackChannel || ''}
                    onChange={(e) => setCustomMeeting((prev) => ({ ...prev, slackChannel: e.target.value }))}
                    className="h-8 text-sm rounded-xl bg-secondary/50"
                  />
                  <Textarea
                    placeholder="Description"
                    value={customMeeting.description || ''}
                    onChange={(e) => setCustomMeeting((prev) => ({ ...prev, description: e.target.value }))}
                    className="text-sm rounded-xl bg-secondary/50 min-h-[60px]"
                  />
                  <Textarea
                    placeholder="Agenda items"
                    value={customMeeting.agenda || ''}
                    onChange={(e) => setCustomMeeting((prev) => ({ ...prev, agenda: e.target.value }))}
                    className="text-sm rounded-xl bg-secondary/50 min-h-[60px]"
                  />
                  <Button onClick={onAddCustomMeeting} size="sm" className="w-full rounded-xl h-8 text-xs">
                    <FiCheck className="w-3 h-3 mr-1" />
                    Add Meeting
                  </Button>
                </CardContent>
              </Card>
            )}
            {filteredMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                isSelected={selectedMeeting?.id === meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
              />
            ))}
            {filteredMeetings.length === 0 && !showCustomForm && (
              <div className="text-center py-8 text-muted-foreground">
                <FiCalendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No meetings found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Detail Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-2xl mx-auto">
            <StatusBanner statusMessage={statusMessage} />

            {selectedMeeting ? (
              <div className="space-y-6 mt-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight mb-1">{selectedMeeting.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FiCalendar className="w-4 h-4" />
                      {formatDate(selectedMeeting.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiClock className="w-4 h-4" />
                      {selectedMeeting.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiClock className="w-4 h-4" />
                      {selectedMeeting.duration}
                    </span>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                  <p className="text-sm text-foreground mt-2 leading-relaxed">{selectedMeeting.description}</p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendees</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedMeeting.attendees.map((attendee, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/60 border border-border text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                          {attendee.charAt(0)}
                        </div>
                        {attendee}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMeeting.agenda && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agenda</Label>
                    <div className="mt-2 p-4 rounded-xl bg-secondary/30 border border-border">
                      {renderMarkdown(selectedMeeting.agenda)}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slack Channel for Context</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g. #engineering"
                        value={slackChannel || selectedMeeting.slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                        className="pl-9 rounded-xl bg-secondary/50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">The AI will pull conversation context from this Slack channel to enrich the summary.</p>
                </div>

                <Button
                  onClick={onGenerateSummary}
                  disabled={isGenerating}
                  className="w-full h-12 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <HiOutlineSparkles className="w-5 h-5 mr-1" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <HiOutlineDocumentText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-2">Select a Meeting</h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Choose a meeting from the list or create a new one to generate an AI-powered summary with action items, key decisions, and insights.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function ReviewView({
  summary,
  setSummary,
  isGenerating,
  isPosting,
  targetChannel,
  setTargetChannel,
  onPostToSlack,
  onBackToDashboard,
  statusMessage,
  onSaveDraft,
}: {
  summary: SummaryData | null
  setSummary: React.Dispatch<React.SetStateAction<SummaryData | null>>
  isGenerating: boolean
  isPosting: boolean
  targetChannel: string
  setTargetChannel: (s: string) => void
  onPostToSlack: () => void
  onBackToDashboard: () => void
  statusMessage: StatusMessage | null
  onSaveDraft: () => void
}) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editActionIdx, setEditActionIdx] = useState<number | null>(null)

  const updateActionItem = useCallback(
    (index: number, field: keyof ActionItem, value: string) => {
      setSummary((prev) => {
        if (!prev) return prev
        const items = Array.isArray(prev.action_items) ? [...prev.action_items] : []
        if (items[index]) {
          items[index] = { ...items[index], [field]: value }
        }
        return { ...prev, action_items: items }
      })
    },
    [setSummary]
  )

  const updateDecision = useCallback(
    (index: number, value: string) => {
      setSummary((prev) => {
        if (!prev) return prev
        const decisions = Array.isArray(prev.key_decisions) ? [...prev.key_decisions] : []
        decisions[index] = value
        return { ...prev, key_decisions: decisions }
      })
    },
    [setSummary]
  )

  const updateInsight = useCallback(
    (index: number, value: string) => {
      setSummary((prev) => {
        if (!prev) return prev
        const insights = Array.isArray(prev.insights) ? [...prev.insights] : []
        insights[index] = value
        return { ...prev, insights: insights }
      })
    },
    [setSummary]
  )

  if (isGenerating) {
    return (
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-screen">
          <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="sm" onClick={onBackToDashboard} className="gap-1 text-muted-foreground rounded-xl">
                <FiArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <h2 className="text-lg font-bold tracking-tight">Generating Summary</h2>
            </div>
            <StatusBanner statusMessage={statusMessage} />
            <div className="mt-6">
              <SkeletonLoader />
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No summary to review.</p>
          <Button variant="ghost" onClick={onBackToDashboard} className="mt-4 gap-2 rounded-xl">
            <FiArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const actionItems = Array.isArray(summary.action_items) ? summary.action_items : []
  const keyDecisions = Array.isArray(summary.key_decisions) ? summary.key_decisions : []
  const insights = Array.isArray(summary.insights) ? summary.insights : []
  const attendees = Array.isArray(summary.attendees) ? summary.attendees : []

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-screen">
        <div className="p-6 max-w-3xl mx-auto pb-32">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={onBackToDashboard} className="gap-1 text-muted-foreground rounded-xl">
              <FiArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h2 className="text-lg font-bold tracking-tight">Review Summary</h2>
          </div>

          <StatusBanner statusMessage={statusMessage} />

          <div className="space-y-6 mt-4">
            {/* Summary Header Card */}
            <Card className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight">{summary.meeting_title || 'Untitled Meeting'}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1.5">
                        <FiCalendar className="w-3.5 h-3.5" />
                        {formatDate(summary.meeting_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FiClock className="w-3.5 h-3.5" />
                        {summary.meeting_time || ''}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                    <HiOutlineSparkles className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {attendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 border border-border text-xs">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
                        {typeof a === 'string' ? a.charAt(0) : '?'}
                      </div>
                      {typeof a === 'string' ? a : 'Unknown'}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary Section */}
            <Card className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <HiOutlineDocumentText className="w-4 h-4 text-primary" />
                    Summary
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'summary' ? null : 'summary')}
                    className="h-7 text-xs gap-1 text-muted-foreground rounded-lg"
                  >
                    <FiEdit2 className="w-3 h-3" />
                    {editingField === 'summary' ? 'Done' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingField === 'summary' ? (
                  <Textarea
                    value={summary.summary || ''}
                    onChange={(e) => setSummary((prev) => prev ? { ...prev, summary: e.target.value } : prev)}
                    className="min-h-[120px] text-sm rounded-xl bg-secondary/30"
                  />
                ) : (
                  <div className="text-sm leading-relaxed text-foreground/90">
                    {renderMarkdown(summary.summary || '')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <HiOutlineClipboardCheck className="w-4 h-4 text-primary" />
                  Action Items
                  <Badge variant="secondary" className="ml-1 text-[10px] h-5">{actionItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No action items</p>
                )}
                {actionItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-secondary/20 border border-border space-y-2">
                    {editActionIdx === idx ? (
                      <div className="space-y-2">
                        <Input
                          value={item.task || ''}
                          onChange={(e) => updateActionItem(idx, 'task', e.target.value)}
                          placeholder="Task description"
                          className="h-8 text-sm rounded-lg bg-secondary/40"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            value={item.owner || ''}
                            onChange={(e) => updateActionItem(idx, 'owner', e.target.value)}
                            placeholder="Owner"
                            className="h-8 text-sm rounded-lg bg-secondary/40"
                          />
                          <select
                            value={item.priority || 'Medium'}
                            onChange={(e) => updateActionItem(idx, 'priority', e.target.value)}
                            className="h-8 text-sm rounded-lg bg-secondary/40 border border-input px-2 text-foreground"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                          <Input
                            type="date"
                            value={item.deadline || ''}
                            onChange={(e) => updateActionItem(idx, 'deadline', e.target.value)}
                            className="h-8 text-sm rounded-lg bg-secondary/40"
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setEditActionIdx(null)} className="h-7 text-xs gap-1 rounded-lg">
                          <FiCheck className="w-3 h-3" />
                          Done
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{item.task || 'No task description'}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <FiUsers className="w-3 h-3" />
                              {item.owner || 'Unassigned'}
                            </span>
                            <Badge variant="outline" className={`text-[10px] h-5 border ${getPriorityColor(item.priority)}`}>
                              {item.priority || 'Medium'}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              {item.deadline ? formatDate(item.deadline) : 'No deadline'}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setEditActionIdx(idx)} className="h-7 w-7 p-0 text-muted-foreground rounded-lg shrink-0">
                          <FiEdit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Key Decisions */}
            <Card className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <HiOutlineClipboardCheck className="w-4 h-4 text-[hsl(191,97%,70%)]" />
                    Key Decisions
                    <Badge variant="secondary" className="ml-1 text-[10px] h-5">{keyDecisions.length}</Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'decisions' ? null : 'decisions')}
                    className="h-7 text-xs gap-1 text-muted-foreground rounded-lg"
                  >
                    <FiEdit2 className="w-3 h-3" />
                    {editingField === 'decisions' ? 'Done' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {keyDecisions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No key decisions recorded</p>
                )}
                <ul className="space-y-2">
                  {keyDecisions.map((decision, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-md bg-[hsl(191,97%,70%)]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <FiCheck className="w-3 h-3 text-[hsl(191,97%,70%)]" />
                      </div>
                      {editingField === 'decisions' ? (
                        <Input
                          value={typeof decision === 'string' ? decision : ''}
                          onChange={(e) => updateDecision(idx, e.target.value)}
                          className="h-8 text-sm rounded-lg bg-secondary/40 flex-1"
                        />
                      ) : (
                        <span className="text-sm text-foreground/90 leading-relaxed">{typeof decision === 'string' ? decision : ''}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Insights */}
            <Card className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <HiOutlineLightBulb className="w-4 h-4 text-[hsl(31,100%,65%)]" />
                    Insights
                    <Badge variant="secondary" className="ml-1 text-[10px] h-5">{insights.length}</Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'insights' ? null : 'insights')}
                    className="h-7 text-xs gap-1 text-muted-foreground rounded-lg"
                  >
                    <FiEdit2 className="w-3 h-3" />
                    {editingField === 'insights' ? 'Done' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {insights.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No insights recorded</p>
                )}
                <ul className="space-y-2">
                  {insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-md bg-[hsl(31,100%,65%)]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <HiOutlineLightBulb className="w-3 h-3 text-[hsl(31,100%,65%)]" />
                      </div>
                      {editingField === 'insights' ? (
                        <Input
                          value={typeof insight === 'string' ? insight : ''}
                          onChange={(e) => updateInsight(idx, e.target.value)}
                          className="h-8 text-sm rounded-lg bg-secondary/40 flex-1"
                        />
                      ) : (
                        <span className="text-sm text-foreground/90 leading-relaxed">{typeof insight === 'string' ? insight : ''}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Post to Slack Section */}
            <Card className="border-primary/20 shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <BsSlack className="w-4 h-4 text-primary" />
                  Post to Slack
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Target Channel</Label>
                  <div className="relative mt-1">
                    <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. #engineering"
                      value={targetChannel}
                      onChange={(e) => setTargetChannel(e.target.value)}
                      className="pl-9 rounded-xl bg-secondary/50"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onPostToSlack}
                    disabled={isPosting || !targetChannel}
                    className="flex-1 h-10 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20"
                  >
                    {isPosting ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Posting...
                      </>
                    ) : (
                      <>
                        <FiSend className="w-4 h-4 mr-1" />
                        Post to Slack
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" onClick={onSaveDraft} className="h-10 rounded-xl text-sm">
                    Save Draft
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function HistoryView({
  history,
  statusMessage,
}: {
  history: HistoryEntry[]
  statusMessage: StatusMessage | null
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState('')

  const filtered = history.filter(
    (h) =>
      (h.meeting_title || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (h.targetChannel || '').toLowerCase().includes(historySearch.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-screen">
        <div className="p-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight">Meeting History</h2>
            <div className="relative w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl bg-secondary/50"
              />
            </div>
          </div>

          <StatusBanner statusMessage={statusMessage} />

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <FiList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No meeting summaries yet</p>
              <p className="text-xs mt-1">Generated summaries will appear here</p>
            </div>
          )}

          <div className="space-y-3 mt-4">
            {filtered.map((entry) => {
              const isExpanded = expandedId === entry.id
              const entryActionItems = Array.isArray(entry.action_items) ? entry.action_items : []
              const entryDecisions = Array.isArray(entry.key_decisions) ? entry.key_decisions : []
              const entryInsights = Array.isArray(entry.insights) ? entry.insights : []
              const entryAttendees = Array.isArray(entry.attendees) ? entry.attendees : []

              return (
                <Card key={entry.id} className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full text-left"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`shrink-0 ${isExpanded ? '' : ''}`}>
                            <FiChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold tracking-tight">{entry.meeting_title || 'Untitled'}</CardTitle>
                            <CardDescription className="flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" />
                                {formatDate(entry.meeting_date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiHash className="w-3 h-3" />
                                {entry.targetChannel || 'N/A'}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'} className={`text-[10px] h-5 ${entry.status === 'posted' ? 'bg-accent text-accent-foreground' : ''}`}>
                          {entry.status === 'posted' ? 'Posted' : 'Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4">
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Attendees</p>
                        <div className="flex flex-wrap gap-1.5">
                          {entryAttendees.map((a, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] h-5">{typeof a === 'string' ? a : 'Unknown'}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
                        <div className="text-sm text-foreground/90 leading-relaxed">
                          {renderMarkdown(entry.summary || '')}
                        </div>
                      </div>
                      {entryActionItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Action Items</p>
                          <div className="space-y-2">
                            {entryActionItems.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20">
                                <HiOutlineClipboardCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm">{item.task || ''}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">{item.owner || 'Unassigned'}</span>
                                    <Badge variant="outline" className={`text-[10px] h-4 border ${getPriorityColor(item.priority)}`}>
                                      {item.priority || 'Medium'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {entryDecisions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Key Decisions</p>
                          <ul className="space-y-1">
                            {entryDecisions.map((d, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <FiCheck className="w-3.5 h-3.5 text-[hsl(191,97%,70%)] shrink-0 mt-0.5" />
                                <span className="text-foreground/90">{typeof d === 'string' ? d : ''}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {entryInsights.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Insights</p>
                          <ul className="space-y-1">
                            {entryInsights.map((ins, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <HiOutlineLightBulb className="w-3.5 h-3.5 text-[hsl(31,100%,65%)] shrink-0 mt-0.5" />
                                <span className="text-foreground/90">{typeof ins === 'string' ? ins : ''}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function SettingsView() {
  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-screen">
        <div className="p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold tracking-tight mb-6">Settings</h2>

          <div className="space-y-6">
            <Card className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold tracking-tight">Integrations</CardTitle>
                <CardDescription>Manage connected services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                      <BsCalendar3 className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Google Calendar</p>
                      <p className="text-xs text-muted-foreground">Connected - syncing events</p>
                    </div>
                  </div>
                  <Badge className="bg-accent text-accent-foreground text-[10px] h-5">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BsSlack className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Slack</p>
                      <p className="text-xs text-muted-foreground">Connected - ready to post</p>
                    </div>
                  </div>
                  <Badge className="bg-accent text-accent-foreground text-[10px] h-5">Active</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold tracking-tight">AI Agents</CardTitle>
                <CardDescription>Active agents powering this assistant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {AGENTS_INFO.map((agent) => (
                  <div key={agent.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/20 border border-border">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{agent.id}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border shadow-lg shadow-black/20 rounded-xl bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-semibold tracking-tight">Preferences</CardTitle>
                <CardDescription>Customize assistant behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-fetch Slack context</p>
                    <p className="text-xs text-muted-foreground">Automatically pull Slack channel context when generating summaries</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Include insights</p>
                    <p className="text-xs text-muted-foreground">Generate AI insights alongside summaries</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-save drafts</p>
                    <p className="text-xs text-muted-foreground">Save generated summaries as drafts automatically</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function Page() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'review' | 'history' | 'settings'>('dashboard')
  const [meetings, setMeetings] = useState<Meeting[]>(MOCK_MEETINGS)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [slackChannel, setSlackChannel] = useState('')
  const [targetChannel, setTargetChannel] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSampleData, setShowSampleData] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customMeeting, setCustomMeeting] = useState<Partial<Meeting>>({})

  // Clear status after a delay
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  // Handle sample data toggle
  useEffect(() => {
    if (showSampleData) {
      setSummary(SAMPLE_SUMMARY)
      setHistory(SAMPLE_HISTORY)
      setSelectedMeeting(MOCK_MEETINGS[0])
      setTargetChannel('#engineering')
    } else {
      setSummary(null)
      setHistory([])
      setSelectedMeeting(null)
      setTargetChannel('')
    }
  }, [showSampleData])

  const handleAddCustomMeeting = useCallback(() => {
    if (!customMeeting.title) {
      setStatusMessage({ type: 'error', text: 'Please enter a meeting title' })
      return
    }
    const newMeeting: Meeting = {
      id: Date.now().toString(),
      title: customMeeting.title || 'Untitled Meeting',
      date: customMeeting.date || new Date().toISOString().split('T')[0],
      time: customMeeting.time || '12:00 PM',
      duration: customMeeting.duration || '1 hour',
      attendees: Array.isArray(customMeeting.attendees) ? customMeeting.attendees : [],
      description: customMeeting.description || '',
      agenda: customMeeting.agenda || '',
      slackChannel: customMeeting.slackChannel || '#general',
    }
    setMeetings((prev) => [newMeeting, ...prev])
    setSelectedMeeting(newMeeting)
    setCustomMeeting({})
    setShowCustomForm(false)
    setStatusMessage({ type: 'success', text: 'Meeting added successfully' })
  }, [customMeeting])

  const handleGenerateSummary = useCallback(async () => {
    if (!selectedMeeting) return
    setIsGenerating(true)
    setCurrentView('review')
    setStatusMessage({ type: 'info', text: 'Generating meeting summary...' })
    setActiveAgentId(AGENT_IDS.coordinator)

    try {
      const channelToUse = slackChannel || selectedMeeting.slackChannel
      const result = await callAIAgent(
        `Generate a comprehensive meeting summary for the following meeting:
Title: ${selectedMeeting.title}
Date: ${selectedMeeting.date}
Time: ${selectedMeeting.time}
Duration: ${selectedMeeting.duration}
Attendees: ${selectedMeeting.attendees.join(', ')}
Description: ${selectedMeeting.description}
Agenda: ${selectedMeeting.agenda}
Slack Channel for context: ${channelToUse}

Please fetch relevant context from the Slack channel and calendar event, then generate a structured summary with action items (each with owner, priority High/Medium/Low, and deadline), key decisions, and insights.`,
        AGENT_IDS.coordinator
      )

      if (result.success) {
        const data = result?.response?.result
        setSummary({
          meeting_title: data?.meeting_title || selectedMeeting.title,
          meeting_date: data?.meeting_date || selectedMeeting.date,
          meeting_time: data?.meeting_time || selectedMeeting.time,
          attendees: Array.isArray(data?.attendees) ? data.attendees : selectedMeeting.attendees,
          summary: data?.summary || '',
          action_items: Array.isArray(data?.action_items)
            ? data.action_items.map((item: any) => ({
                task: item?.task || '',
                owner: item?.owner || 'Unassigned',
                priority: item?.priority || 'Medium',
                deadline: item?.deadline || 'TBD',
              }))
            : [],
          key_decisions: Array.isArray(data?.key_decisions) ? data.key_decisions : [],
          insights: Array.isArray(data?.insights) ? data.insights : [],
        })
        setTargetChannel(channelToUse)
        setStatusMessage({ type: 'success', text: 'Summary generated successfully!' })
      } else {
        setStatusMessage({ type: 'error', text: result?.error || 'Failed to generate summary' })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'An error occurred while generating the summary' })
    } finally {
      setIsGenerating(false)
      setActiveAgentId(null)
    }
  }, [selectedMeeting, slackChannel])

  const handlePostToSlack = useCallback(async () => {
    if (!summary || !targetChannel) return
    setIsPosting(true)
    setStatusMessage({ type: 'info', text: 'Posting summary to Slack...' })
    setActiveAgentId(AGENT_IDS.slackPublisher)

    try {
      const summaryAttendees = Array.isArray(summary.attendees) ? summary.attendees.join(', ') : ''
      const summaryActions = Array.isArray(summary.action_items)
        ? summary.action_items
            .map((item: ActionItem) => `- ${item.task} | Owner: ${item.owner} | Priority: ${item.priority} | Deadline: ${item.deadline}`)
            .join('\n')
        : 'None'
      const summaryDecisions = Array.isArray(summary.key_decisions)
        ? summary.key_decisions.map((d: string) => `- ${d}`).join('\n')
        : 'None'
      const summaryInsights = Array.isArray(summary.insights)
        ? summary.insights.map((i: string) => `- ${i}`).join('\n')
        : 'None'

      const result = await callAIAgent(
        `Post this meeting summary to Slack channel "${targetChannel}":

Meeting Title: ${summary.meeting_title}
Date: ${summary.meeting_date} at ${summary.meeting_time}
Attendees: ${summaryAttendees}

Summary: ${summary.summary}

Action Items:
${summaryActions}

Key Decisions:
${summaryDecisions}

Insights:
${summaryInsights}`,
        AGENT_IDS.slackPublisher
      )

      if (result.success) {
        const responseData = result?.response?.result
        const historyEntry: HistoryEntry = {
          id: Date.now().toString(),
          ...summary,
          status: 'posted',
          targetChannel,
          postedAt: responseData?.posted_at || new Date().toISOString(),
        }
        setHistory((prev) => [historyEntry, ...prev])
        const channelName = responseData?.channel || targetChannel
        setStatusMessage({ type: 'success', text: `Summary posted to ${channelName} successfully!` })
      } else {
        setStatusMessage({ type: 'error', text: result?.error || 'Failed to post to Slack' })
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'An error occurred while posting to Slack' })
    } finally {
      setIsPosting(false)
      setActiveAgentId(null)
    }
  }, [summary, targetChannel])

  const handleSaveDraft = useCallback(() => {
    if (!summary) return
    const draftEntry: HistoryEntry = {
      id: Date.now().toString(),
      ...summary,
      status: 'draft',
      targetChannel: targetChannel || '',
      postedAt: new Date().toISOString(),
    }
    setHistory((prev) => [draftEntry, ...prev])
    setStatusMessage({ type: 'success', text: 'Draft saved to history' })
  }, [summary, targetChannel])

  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard')
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground font-sans flex">
        {/* Sidebar */}
        <SidebarNav
          currentView={currentView}
          setCurrentView={setCurrentView}
          activeAgentId={activeAgentId}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-6 bg-background">
            <div className="flex items-center gap-2">
              {currentView === 'dashboard' && <FiGrid className="w-4 h-4 text-primary" />}
              {currentView === 'review' && <HiOutlineSparkles className="w-4 h-4 text-primary" />}
              {currentView === 'history' && <FiList className="w-4 h-4 text-primary" />}
              {currentView === 'settings' && <FiSettings className="w-4 h-4 text-primary" />}
              <span className="text-sm font-semibold tracking-tight capitalize">
                {currentView === 'review' ? 'Summary Review' : currentView}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">
                Sample Data
              </Label>
              <Switch
                id="sample-toggle"
                checked={showSampleData}
                onCheckedChange={setShowSampleData}
              />
            </div>
          </div>

          {/* Views */}
          {currentView === 'dashboard' && (
            <DashboardView
              meetings={meetings}
              selectedMeeting={selectedMeeting}
              setSelectedMeeting={setSelectedMeeting}
              slackChannel={slackChannel}
              setSlackChannel={setSlackChannel}
              onGenerateSummary={handleGenerateSummary}
              isGenerating={isGenerating}
              statusMessage={statusMessage}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showCustomForm={showCustomForm}
              setShowCustomForm={setShowCustomForm}
              customMeeting={customMeeting}
              setCustomMeeting={setCustomMeeting}
              onAddCustomMeeting={handleAddCustomMeeting}
            />
          )}

          {currentView === 'review' && (
            <ReviewView
              summary={summary}
              setSummary={setSummary}
              isGenerating={isGenerating}
              isPosting={isPosting}
              targetChannel={targetChannel}
              setTargetChannel={setTargetChannel}
              onPostToSlack={handlePostToSlack}
              onBackToDashboard={handleBackToDashboard}
              statusMessage={statusMessage}
              onSaveDraft={handleSaveDraft}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              history={history}
              statusMessage={statusMessage}
            />
          )}

          {currentView === 'settings' && <SettingsView />}
        </div>
      </div>
    </ErrorBoundary>
  )
}
