import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Bell,
  BellOff,
  BellRing,
  Zap,
  Sparkles,
  AlarmClock,
  AlarmClockCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  MessageSquare,
  Mail,
  Search,
  Copy,
  Check,
  RefreshCw,
  Eye,
  ExternalLink,
  Cpu,
  User,
  LogOut,
  X,
  Flame,
  Volume2,
  VolumeX,
  Send,
  ChevronRight,
  Trash2,
  Play,
  Pause,
  Key,
  Download,
  Upload,
  FileText,
  Share2,
  Plus,
  Mic,
  Square,
  Settings,
  Radio,
  AtSign,
  Crown,
  CheckCheck
} from 'lucide-react';

// --- Web Audio Notification & Synthesized Alarm Chimes ---
type AlarmChimeType = 'two-tone' | 'emergency' | 'gentle' | 'digital';

function playAlarmSound(type: AlarmChimeType = 'two-tone', volume: number = 0.8) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, start: number, duration: number, oscType: OscillatorType = 'triangle') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.25 * volume, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    if (type === 'two-tone') {
      playTone(880, 0, 0.15); // A5
      playTone(1174.66, 0.18, 0.2); // D6
      playTone(880, 0.4, 0.15);
      playTone(1174.66, 0.58, 0.28);
    } else if (type === 'emergency') {
      playTone(987.77, 0, 0.12, 'sawtooth');
      playTone(1318.51, 0.14, 0.12, 'sawtooth');
      playTone(987.77, 0.28, 0.12, 'sawtooth');
      playTone(1318.51, 0.42, 0.2, 'sawtooth');
    } else if (type === 'gentle') {
      playTone(523.25, 0, 0.25, 'sine');
      playTone(659.25, 0.2, 0.25, 'sine');
      playTone(783.99, 0.4, 0.35, 'sine');
    } else if (type === 'digital') {
      playTone(1046.5, 0, 0.08, 'square');
      playTone(1046.5, 0.12, 0.08, 'square');
      playTone(1046.5, 0.24, 0.15, 'square');
    }
  } catch {
    // audio fallback safe
  }
}

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // safe
  }
}

// --- Helper: Detect Authentic Leadership (HOD, Head, Principal, Director, CTO) ---
export function isAuthenticLeader(role: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return (
    r.includes('hod') ||
    r.includes('head') ||
    r.includes('principal') ||
    r.includes('principle') ||
    r.includes('director') ||
    r.includes('cto') ||
    r.includes('vp') ||
    r.includes('dean')
  );
}

// --- Data Types ---
type ScenarioId = 'outage' | 'design' | 'casual';
type SummaryMode = 'brief' | 'detailed';

interface DirectMentionItem {
  id: string;
  sender: string;
  role: string;
  avatar: string;
  channel: string;
  sourceType: 'Slack' | 'Telegram' | 'Discord' | 'Email';
  timestamp: string;
  text: string;
  isUrgent: boolean;
  isLeadership: boolean;
  acknowledged: boolean;
}

interface ChatMessage {
  id: string;
  source: 'Slack' | 'Telegram' | 'Discord' | 'Email';
  channel: string;
  author: string;
  role: string;
  avatar: string;
  timestamp: string;
  text: string;
  isUrgent: boolean;
  highlightWords?: string[];
}

interface TaskItem {
  id: string;
  title: string;
  isUrgent: boolean;
  deadlineMinutes: number;
  sourceChannel: string;
  sourceType: 'Slack' | 'Telegram' | 'Discord' | 'Email';
  completed: boolean;
  snoozedCount: number;
  alarmSet?: {
    minutesBefore: number;
    label: string;
    sound: boolean;
    chimeType: AlarmChimeType;
  };
  aiAssist: {
    backgroundBrief: string;
    actionChecklist: string[];
    drafts: {
      stakeholder: string;
      technical: string;
      quickAck: string;
    };
  };
}

interface DecisionItem {
  id: string;
  type: 'decided' | 'proposed' | 'blocked';
  title: string;
  detail: string;
  decidedBy: string;
  role?: string;
  channel: string;
  sourceType: 'Slack' | 'Telegram' | 'Discord' | 'Email';
  timestamp: string;
  isUrgent?: boolean;
}

interface UrgentAlert {
  id: string;
  title: string;
  isUrgent: boolean;
  summary: string;
  whyUrgent: string;
  impactedServices: string[];
  timestamp: string;
  channel: string;
  acknowledged: boolean;
}

interface ScenarioData {
  id: ScenarioId;
  name: string;
  subtitle: string;
  totalMessages: number;
  noiseFilteredCount: number;
  urgencyGauge: number;
  sources: {
    slack: { unread: number; urgency: number; channel: string };
    telegram: { unread: number; urgency: number; channel: string };
    discord: { unread: number; urgency: number; channel: string };
    email: { unread: number; urgency: number; channel: string };
  };
  briefing: {
    brief: string[];
    detailed: {
      executiveDigest: string;
      rootCauseAnalysis: string;
      stakeholderTimeline: { time: string; actor: string; action: string; citation: string }[];
      mitigationPlan: string;
    };
  };
  mentions: DirectMentionItem[];
  alerts: UrgentAlert[];
  tasks: TaskItem[];
  decisions: DecisionItem[];
  rawMessages: ChatMessage[];
}

// --- Scenarios Data with Leadership & Direct Mentions ---
const SCENARIOS: Record<ScenarioId, ScenarioData> = {
  outage: {
    id: 'outage',
    name: 'Production Outage',
    subtitle: 'API Gateway 502 Spike & DB Pool Starvation',
    totalMessages: 418,
    noiseFilteredCount: 356,
    urgencyGauge: 94,
    sources: {
      slack: { unread: 224, urgency: 98, channel: '#incident-room' },
      telegram: { unread: 38, urgency: 92, channel: 'Exec Emergency Bridge' },
      discord: { unread: 108, urgency: 45, channel: '#community-reports' },
      email: { unread: 48, urgency: 82, channel: 'PagerDuty & CTO Thread' },
    },
    briefing: {
      brief: [
        'API Gateway 502 error rate spiked to 14.8% at 14:02 PST due to PostgreSQL connection pool exhaustion.',
        'Root cause isolated to runaway analytics query (PID 48291) deployed in routine batch job.',
        'DBA team killed stale processes; connection pool recovering (currently 34/100 connections). Statuspage update pending.',
      ],
      detailed: {
        executiveDigest:
          'Between 14:02 and 14:26 PST, production services experienced severe degradation affecting 14.8% of user traffic. Inbound chat streams were inundated with panicked reports, redundant pingings, and duplicate incident logs. CatchUp AI filtered 356 low-value noise messages (such as "is prod down?", reaction memes, and repeated ping alerts), distilling the incident down to core remediation events.',
        rootCauseAnalysis:
          'A recurring financial reconciler batch job executed an unindexed full-table join across `ledger_entries` and `customer_wallets`. This held 68 concurrent locks for >9 minutes, starving the HTTP API connection pool. Once connection limits were exhausted, NGINX upstream servers returned 502 Bad Gateway.',
        stakeholderTimeline: [
          { time: '14:02:14', actor: 'PagerDuty Bot', action: 'Triggered Sev-1 incident #9042 on API Gateway', citation: 'Slack #incident-room' },
          { time: '14:05:30', actor: 'Dave SRE', action: 'Confirmed RDS CPU at 99.4% and active pool at 100/100', citation: 'Slack #incident-room' },
          { time: '14:12:00', actor: 'Dr. Sarah Jenkins (HOD & CTO)', action: 'Direct message: Require immediate rollback or pool flush; customers queuing', citation: 'Telegram Exec Bridge' },
          { time: '14:18:45', actor: 'Marcus Vance (Principal Architect)', action: 'Killed PID 48291 and applied temporary max_connections override', citation: 'Slack #incident-room' },
          { time: '14:24:10', actor: 'Elena Rostova (Head of DevOps)', action: 'Verified traffic normalization; zero 5xx on edge routers', citation: 'Discord #community-reports' },
        ],
        mitigationPlan:
          'Implement query runtime guardrails (statement_timeout = 15000ms), establish dedicated read-replica for financial analytics batch tasks, and deploy health check auto-shedding on the API Gateway.',
      },
    },
    mentions: [
      {
        id: 'men-1',
        sender: 'Dr. Sarah Jenkins',
        role: 'HOD & VP of Engineering / CTO',
        avatar: 'SJ',
        channel: 'Telegram Exec Bridge',
        sourceType: 'Telegram',
        timestamp: '14:12 PST',
        text: '@Alex Chen We need you to verify the PgBouncer statement_timeout on the primary cluster immediately. Revenue checkouts are queueing.',
        isUrgent: true,
        isLeadership: true,
        acknowledged: false,
      },
      {
        id: 'men-2',
        sender: 'Prof. Marcus Vance',
        role: 'Principal Systems Architect',
        avatar: 'MV',
        channel: '#incident-room',
        sourceType: 'Slack',
        timestamp: '14:16 PST',
        text: '@Alex Can you confirm if PID 48291 lock cleanup released the IOPS burst credits? Status page is waiting on your sign-off.',
        isUrgent: true,
        isLeadership: true,
        acknowledged: false,
      },
      {
        id: 'men-3',
        sender: 'Elena Rostova',
        role: 'Head of Infrastructure',
        avatar: 'ER',
        channel: '#incident-room',
        sourceType: 'Slack',
        timestamp: '14:21 PST',
        text: '@Alex Statuspage notification draft is in the shared queue for your review whenever you are clear.',
        isUrgent: false,
        isLeadership: true,
        acknowledged: true,
      },
    ],
    alerts: [
      {
        id: 'alt-1',
        title: '502 Bad Gateway Spike on API Gateway US-East-1',
        isUrgent: true,
        summary: 'Error rate reached 14.8%. Customer checkouts and token verifications temporarily dropped.',
        whyUrgent: 'Direct user-facing outage impacting payments and authentication endpoints.',
        impactedServices: ['auth-service', 'checkout-v2', 'edge-gateway'],
        timestamp: '14:02 PST',
        channel: '#incident-room',
        acknowledged: false,
      },
      {
        id: 'alt-2',
        title: 'PostgreSQL RDS Connection Pool Exhaustion (100/100)',
        isUrgent: true,
        summary: 'Runaway analytics query locked rows on master instance.',
        whyUrgent: 'Database starvation blocks all transactional API writes.',
        impactedServices: ['rds-postgres-primary', 'pgbouncer-pool'],
        timestamp: '14:08 PST',
        channel: 'Exec Emergency Bridge',
        acknowledged: true,
      },
    ],
    tasks: [
      {
        id: 'tsk-1',
        title: 'Publish External Incident Update on Statuspage',
        isUrgent: true,
        deadlineMinutes: 18,
        sourceChannel: '#incident-room',
        sourceType: 'Slack',
        completed: false,
        snoozedCount: 0,
        alarmSet: {
          minutesBefore: 5,
          label: '5m Before Deadline',
          sound: true,
          chimeType: 'two-tone',
        },
        aiAssist: {
          backgroundBrief:
            'Incident #9042 has recovered, but customer agreements mandate an official status bulletin within 30 minutes of stabilization.',
          actionChecklist: [
            'Log into Statuspage portal with incident manager role',
            'Select impacted components: API Gateway, User Auth, Checkout',
            'Set status state to "Monitoring - Fix Deployed & Latency Normalizing"',
            'Post approved update copy to external subscribers',
          ],
          drafts: {
            stakeholder:
              'Status Update: Between 14:02 and 14:26 PST, our API Gateway experienced elevated error rates affecting authentication and checkout requests. Our database engineering team identified and terminated an unresponsive background batch query, restoring full system capacity.',
            technical:
              'Incident Remediation Notice: Connection pool saturation on postgres-primary resolved at 14:24 PST following manual termination of blocked transaction PID 48291. Pool usage down to 34%.',
            quickAck:
              'Update posted to status.company.com. Service metrics are stable.',
          },
        },
      },
      {
        id: 'tsk-2',
        title: 'Kill Runaway Query & Confirm Statement Timeout Limit',
        isUrgent: true,
        deadlineMinutes: 32,
        sourceChannel: 'Exec Emergency Bridge',
        sourceType: 'Telegram',
        completed: false,
        snoozedCount: 0,
        aiAssist: {
          backgroundBrief:
            'HOD & CTO Sarah Jenkins requested confirmation that statement_timeout has been locked at 15s on production read instances.',
          actionChecklist: [
            'Verify pg_stat_activity shows zero active queries > 30s',
            'Inspect /etc/postgresql.conf parameter `statement_timeout = 15000`',
            'Confirm PgBouncer client timeout configs match RDS limits',
            'Send confirmation report to HOD Sarah on Telegram',
          ],
          drafts: {
            stakeholder:
              'Sarah, the rogue reconciler transaction was terminated, and we have applied a strict 15-second statement timeout across all production DB instances.',
            technical:
              'Confirmed: `statement_timeout = 15000` set and verified via SHOW statement_timeout; PgBouncer pool recycled with 0 dropped client sockets.',
            quickAck:
              'Timeout applied and verified. DB pool is healthy and operating within headroom limits.',
          },
        },
      },
      {
        id: 'tsk-3',
        title: 'Draft Post-Mortem Timeline Draft in Notion',
        isUrgent: false,
        deadlineMinutes: 195,
        sourceChannel: 'PagerDuty & CTO Thread',
        sourceType: 'Email',
        completed: false,
        snoozedCount: 0,
        aiAssist: {
          backgroundBrief:
            'Engineering leadership mandates a timeline of events from initial detection (14:02) to mitigation (14:26).',
          actionChecklist: [
            'Pull exact timestamps from Datadog error spike graph',
            'Extract chat citations from #incident-room log',
            'Outline 5 Whys and post review schedule',
          ],
          drafts: {
            stakeholder:
              'Draft post-mortem timeline is prepared for review. Summary: Total outage window was 24 minutes with 14.8% error rate peak.',
            technical:
              'Post-mortem document initialized with CloudWatch/Datadog metric links and Slack thread excerpts.',
            quickAck: 'Draft created in Notion with full timestamp timeline.',
          },
        },
      },
    ],
    decisions: [
      {
        id: 'dec-1',
        type: 'decided',
        title: 'Bypass Cache Warmup Worker During Recovery',
        detail: 'DBA team voted to keep cache warming paused for 45 minutes to prevent secondary read spikes on postgres-primary.',
        decidedBy: 'Marcus Vance',
        role: 'Principal Database Architect',
        channel: '#incident-room',
        sourceType: 'Slack',
        timestamp: '14:19 PST',
        isUrgent: true,
      },
      {
        id: 'dec-2',
        type: 'decided',
        title: 'Rollback of v3.4.1 Release Postponed',
        detail: 'Confirmed that binary rollback is unnecessary since the bug originated in cron job queries, not application code.',
        decidedBy: 'Dr. Sarah Jenkins',
        role: 'HOD & CTO',
        channel: 'Exec Emergency Bridge',
        sourceType: 'Telegram',
        timestamp: '14:22 PST',
        isUrgent: true,
      },
    ],
    rawMessages: [
      {
        id: 'm-1',
        source: 'Slack',
        channel: '#incident-room',
        author: 'Dave Miller',
        role: 'Staff SRE',
        avatar: 'DM',
        timestamp: '14:02:18 PST',
        text: '@channel Heads up! Datadog APM alerting on API Gateway 502 spike. Error rate is 14.8% and climbing fast.',
        isUrgent: true,
        highlightWords: ['502 spike', 'API Gateway', '14.8%'],
      },
      {
        id: 'm-2',
        source: 'Telegram',
        channel: 'Exec Emergency Bridge',
        author: 'Dr. Sarah Jenkins',
        role: 'HOD & VP of Engineering / CTO',
        avatar: 'SJ',
        timestamp: '14:06:50 PST',
        text: '@Alex Chen Just jumped on the call. Support VP called me—enterprise checkout flows are failing. What is our MTTR estimate?',
        isUrgent: true,
        highlightWords: ['enterprise checkout', 'failing', 'MTTR'],
      },
      {
        id: 'm-3',
        source: 'Slack',
        channel: '#incident-room',
        author: 'Marcus Vance',
        role: 'Principal Systems Architect',
        avatar: 'MV',
        timestamp: '14:09:12 PST',
        text: 'Found it! RDS max_connections hit 100/100. PID 48291 has been holding an exclusive lock on customer_wallets for 11 minutes!',
        isUrgent: true,
        highlightWords: ['PID 48291', 'exclusive lock', 'max_connections'],
      },
      {
        id: 'm-4',
        source: 'Slack',
        channel: '#incident-room',
        author: 'Marcus Vance',
        role: 'Principal Systems Architect',
        avatar: 'MV',
        timestamp: '14:18:22 PST',
        text: 'Sent pg_terminate_backend(48291). Active connections dropped immediately to 38. Latency returning to 110ms.',
        isUrgent: true,
        highlightWords: ['pg_terminate_backend', 'connections dropped'],
      },
    ],
  },

  design: {
    id: 'design',
    name: 'Design Sync',
    subtitle: 'Design System v2.4 Tokens & Handoff',
    totalMessages: 294,
    noiseFilteredCount: 238,
    urgencyGauge: 52,
    sources: {
      slack: { unread: 142, urgency: 62, channel: '#design-tokens' },
      telegram: { unread: 24, urgency: 35, channel: 'Creative Leads Group' },
      discord: { unread: 84, urgency: 48, channel: '#figma-feedback' },
      email: { unread: 44, urgency: 58, channel: 'Design Review & Assets' },
    },
    briefing: {
      brief: [
        'Design System v2.4 typography tokens finalized: switched from 8px to 4px baseline sub-grid.',
        'Mobile navigation bar refactor approved; iOS Safari 17 viewport unit bug fix incorporated.',
        'Handoff deadline for Sprint 42 scheduled for tomorrow at 12:00 PST with engineering lead review.',
      ],
      detailed: {
        executiveDigest:
          'Design System v2.4 represents a comprehensive modernization of web and mobile interface primitives. CatchUp AI filtered 238 conversational back-and-forth remarks.',
        rootCauseAnalysis:
          'Inconsistent color hex values between legacy CSS and new Tailwind theme files caused WCAG AA contrast failures.',
        stakeholderTimeline: [
          { time: '10:00:20', actor: 'Chloe Lin (HOD Design)', action: 'Uploaded Token Spec v2.4 with updated contrast ratios', citation: 'Slack #design-tokens' },
          { time: '11:15:00', actor: 'Marcus Vance (Head of Product)', action: 'Approved color palettes for dark mode compliance', citation: 'Email Review' },
        ],
        mitigationPlan:
          'Run automated CI stylelint check against Figma token JSON exports.',
      },
    },
    mentions: [
      {
        id: 'men-d1',
        sender: 'Chloe Lin',
        role: 'HOD & Head of Product Design',
        avatar: 'CL',
        channel: '#design-tokens',
        sourceType: 'Slack',
        timestamp: '10:15 PST',
        text: '@Alex Chen Please review token mapping v2.4 in Figma before the sprint handoff cutoff at 12:00.',
        isUrgent: true,
        isLeadership: true,
        acknowledged: false,
      },
      {
        id: 'men-d2',
        sender: 'Marcus Vance',
        role: 'Principal Architect & Head of Web',
        avatar: 'MV',
        channel: '#figma-feedback',
        sourceType: 'Discord',
        timestamp: '10:52 PST',
        text: '@Alex Mobile drawer tap targets need your sign-off for Safari 17 viewport unit adjustments.',
        isUrgent: false,
        isLeadership: true,
        acknowledged: false,
      },
    ],
    alerts: [
      {
        id: 'alt-d1',
        title: 'Mobile Navigation Overflow on iOS Safari 17',
        isUrgent: true,
        summary: 'Bottom nav buttons obscured by dynamic URL bar on touch devices.',
        whyUrgent: 'Blocks mobile QA testing slated for 15:00 PST release cut.',
        impactedServices: ['mobile-web-client'],
        timestamp: '10:48 PST',
        channel: '#figma-feedback',
        acknowledged: false,
      },
    ],
    tasks: [
      {
        id: 'tsk-d1',
        title: 'Export Token v2.4 JSON to Frontend Repo',
        isUrgent: true,
        deadlineMinutes: 75,
        sourceChannel: '#design-tokens',
        sourceType: 'Slack',
        completed: false,
        snoozedCount: 0,
        alarmSet: {
          minutesBefore: 15,
          label: '15m Before Deadline',
          sound: true,
          chimeType: 'gentle',
        },
        aiAssist: {
          backgroundBrief:
            'Engineering squad cannot begin implementing revised Tailwind config until Figma token JSON is committed.',
          actionChecklist: [
            'Run Token Studio Figma plugin sync',
            'Validate JSON schema format',
            'Create Pull Request against feat/token-v2.4',
          ],
          drafts: {
            stakeholder: 'The v2.4 token file is ready for import into the frontend library.',
            technical: 'PR created for packages/tokens containing 42 updated color variables.',
            quickAck: 'Tokens exported and PR opened.',
          },
        },
      },
    ],
    decisions: [
      {
        id: 'dec-d1',
        type: 'decided',
        title: 'Adopt 4px Baseline Grid Across All Components',
        detail: 'Team unanimously approved replacing half-pixel subpixel margins with strict 4px grid steps.',
        decidedBy: 'Chloe Lin',
        role: 'HOD Design',
        channel: '#design-tokens',
        sourceType: 'Slack',
        timestamp: '10:35 PST',
        isUrgent: true,
      },
    ],
    rawMessages: [
      {
        id: 'md-1',
        source: 'Slack',
        channel: '#design-tokens',
        author: 'Chloe Lin',
        role: 'HOD & Head of Product Design',
        avatar: 'CL',
        timestamp: '10:00:20 PST',
        text: 'Morning team! I have published the revised Token Spec v2.4 in Figma. Please review the updated color mappings.',
        isUrgent: false,
      },
    ],
  },

  casual: {
    id: 'casual',
    name: 'Casual Chatter',
    subtitle: 'Watercooler, Memes & Team Social Stream',
    totalMessages: 580,
    noiseFilteredCount: 554,
    urgencyGauge: 12,
    sources: {
      slack: { unread: 340, urgency: 15, channel: '#watercooler' },
      telegram: { unread: 48, urgency: 8, channel: 'Friday Lunch Crew' },
      discord: { unread: 172, urgency: 10, channel: '#gaming-and-memes' },
      email: { unread: 20, urgency: 14, channel: 'Newsletter & Offsite RSVP' },
    },
    briefing: {
      brief: [
        'Team lunch decided: Ramen at Mensho Tokyo at 12:45 PST (6 people RSVPd).',
        'Friday trivia session scheduled for 16:30 PST on Zoom / Discord.',
        'High noise stream: 95.5% of 580 messages filtered as social banter and reaction GIFs.',
      ],
      detailed: {
        executiveDigest:
          'This stream demonstrates CatchUp AI’s noise reduction power in non-emergency conditions. Across 580 raw messages, 554 were determined to be zero-urgency social conversation.',
        rootCauseAnalysis: 'Channel activity was driven by end-of-week social chatter.',
        stakeholderTimeline: [
          { time: '11:00:15', actor: 'Sam K.', action: 'Shared photo of new golden retriever puppy', citation: 'Slack #watercooler' },
        ],
        mitigationPlan: 'No mitigation required. Enjoy the team lunch!',
      },
    },
    mentions: [
      {
        id: 'men-c1',
        sender: 'Prof. Harrison Cole',
        role: 'Principal Research Director & Head of Lab',
        avatar: 'HC',
        channel: 'Telegram Friday Lunch',
        sourceType: 'Telegram',
        timestamp: '11:35 PST',
        text: '@Alex Chen Are you walking over with the platform team for the Mensho Tokyo lunch table at 12:45?',
        isUrgent: false,
        isLeadership: true,
        acknowledged: false,
      },
    ],
    alerts: [
      {
        id: 'alt-c1',
        title: 'Quarterly Offsite RSVP Deadline (Today 17:00 PST)',
        isUrgent: true,
        summary: 'Headcount needed for venue reservation and dietary restrictions.',
        whyUrgent: 'Catering vendor locks headcount 14 days in advance.',
        impactedServices: ['offsite-logistics'],
        timestamp: '12:10 PST',
        channel: 'Newsletter & Offsite RSVP',
        acknowledged: false,
      },
    ],
    tasks: [
      {
        id: 'tsk-c1',
        title: 'RSVP for Quarterly Team Offsite Dinner',
        isUrgent: false,
        deadlineMinutes: 240,
        sourceChannel: 'Newsletter & Offsite RSVP',
        sourceType: 'Email',
        completed: false,
        snoozedCount: 0,
        aiAssist: {
          backgroundBrief:
            'Office operations needs confirmation for venue booking. Options include dinner attendance and dietary preferences.',
          actionChecklist: ['Open Google Form', 'Select attendance status', 'Submit RSVP'],
          drafts: {
            stakeholder: 'Hi team, confirming that I will attend the offsite dinner on Friday.',
            technical: 'RSVP form completed and submitted.',
            quickAck: 'RSVP submitted for the offsite. See everyone there!',
          },
        },
      },
    ],
    decisions: [
      {
        id: 'dec-c1',
        type: 'decided',
        title: 'Team Lunch Venue: Mensho Tokyo Ramen',
        detail: 'Ramen venue selected with 8 votes over pizza and tacos.',
        decidedBy: 'Lunch Crew',
        role: 'Team Lead',
        channel: 'Friday Lunch Crew',
        sourceType: 'Telegram',
        timestamp: '11:42 PST',
        isUrgent: false,
      },
    ],
    rawMessages: [
      {
        id: 'mc-1',
        source: 'Slack',
        channel: '#watercooler',
        author: 'Sam K.',
        role: 'Marketing Lead',
        avatar: 'SK',
        timestamp: '11:00:15 PST',
        text: 'Look at my new puppy Winston!! *attaches 4 high-res photos*',
        isUrgent: false,
      },
    ],
  },
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function App() {
  // Scenario state
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>('outage');
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('brief');
  const [urgentOnlyFilter, setUrgentOnlyFilter] = useState<boolean>(false);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string | null>(null);

  // Interactivity states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Voice Briefing State
  const [isVoicePlaying, setIsVoicePlaying] = useState<boolean>(false);
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);
  const [voiceRate, setVoiceRate] = useState<number>(1.05);

  // Right pane tab: Added "mentions" alongside tasks, decisions, alerts
  const [rightPaneTab, setRightPaneTab] = useState<'tasks' | 'mentions' | 'decisions' | 'alerts'>('tasks');

  // Mobile layout tab
  const [mobileTab, setMobileTab] = useState<'sources' | 'briefing' | 'actions'>('briefing');

  // Modals & Pages
  const [aiAssistTask, setAiAssistTask] = useState<TaskItem | null>(null);
  const [rawContextData, setRawContextData] = useState<{
    title: string;
    source: string;
    messages: ChatMessage[];
  } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Alarm Settings Page / Modal
  const [isAlarmSettingsOpen, setIsAlarmSettingsOpen] = useState<boolean>(false);
  const [defaultLeadMinutes, setDefaultLeadMinutes] = useState<number>(10);
  const [globalChimeType, setGlobalChimeType] = useState<AlarmChimeType>('two-tone');
  const [alarmVolume, setAlarmVolume] = useState<number>(0.85);

  // Task-specific quick alarm setter modal
  const [settingAlarmTask, setSettingAlarmTask] = useState<TaskItem | null>(null);

  // IMPORT CHATS MODAL (renamed from export chats as requested!)
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importSourceType, setImportSourceType] = useState<string>('whatsapp');
  const [importChatText, setImportChatText] = useState<string>('');

  // Triggered Alarm Banner State
  const [triggeredAlarm, setTriggeredAlarm] = useState<{
    taskTitle: string;
    deadlineMinutes: number;
    channel: string;
  } | null>(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeUser, setActiveUser] = useState({
    name: 'Alex Chen',
    role: 'Principal Platform Engineer',
    email: 'alex.chen@company.io',
    avatar: 'AC',
  });

  // Dynamic state per scenario
  const [scenarioTasks, setScenarioTasks] = useState<Record<ScenarioId, TaskItem[]>>({
    outage: SCENARIOS.outage.tasks,
    design: SCENARIOS.design.tasks,
    casual: SCENARIOS.casual.tasks,
  });

  const [scenarioAlerts, setScenarioAlerts] = useState<Record<ScenarioId, UrgentAlert[]>>({
    outage: SCENARIOS.outage.alerts,
    design: SCENARIOS.design.alerts,
    casual: SCENARIOS.casual.alerts,
  });

  const [scenarioMentions, setScenarioMentions] = useState<Record<ScenarioId, DirectMentionItem[]>>({
    outage: SCENARIOS.outage.mentions,
    design: SCENARIOS.design.mentions,
    casual: SCENARIOS.casual.mentions,
  });

  // Toasts
  const [toasts, setToasts] = useState<
    { id: string; title: string; desc: string; type: 'info' | 'urgent' | 'success' }[]
  >([]);

  const addToast = (title: string, desc: string, type: 'info' | 'urgent' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, desc, type }]);
    if (soundEnabled && type === 'urgent') {
      playNotificationChime();
    }
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setAiAssistTask(null);
        setRawContextData(null);
        setIsAuthModalOpen(false);
        setIsAlarmSettingsOpen(false);
        setSettingAlarmTask(null);
        setIsImportModalOpen(false);
        setTriggeredAlarm(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active scenario data
  const currentScenario = SCENARIOS[activeScenarioId];
  const allScenarioTasks = scenarioTasks[activeScenarioId] || [];
  const allScenarioAlerts = scenarioAlerts[activeScenarioId] || [];
  const allScenarioMentions = scenarioMentions[activeScenarioId] || [];

  // Filtering for Urgent Only Mode
  const visibleTasks = useMemo(() => {
    let list = allScenarioTasks;
    if (urgentOnlyFilter) {
      list = list.filter((t) => t.isUrgent);
    }
    return list;
  }, [allScenarioTasks, urgentOnlyFilter]);

  const visibleAlerts = useMemo(() => {
    let list = allScenarioAlerts;
    if (urgentOnlyFilter) {
      list = list.filter((a) => a.isUrgent && !a.acknowledged);
    }
    return list;
  }, [allScenarioAlerts, urgentOnlyFilter]);

  const visibleDecisions = useMemo(() => {
    let list = currentScenario.decisions;
    if (urgentOnlyFilter) {
      list = list.filter((d) => d.isUrgent);
    }
    return list;
  }, [currentScenario.decisions, urgentOnlyFilter]);

  const visibleMentions = useMemo(() => {
    let list = allScenarioMentions;
    if (urgentOnlyFilter) {
      list = list.filter((m) => m.isUrgent);
    }
    return list;
  }, [allScenarioMentions, urgentOnlyFilter]);

  // Counts
  const urgentTasksCount = useMemo(() => {
    return allScenarioTasks.filter((t) => !t.completed && t.isUrgent).length;
  }, [allScenarioTasks]);

  const unreadMentionsCount = useMemo(() => {
    return allScenarioMentions.filter((m) => !m.acknowledged).length;
  }, [allScenarioMentions]);

  const activeAlarmsCount = useMemo(() => {
    return allScenarioTasks.filter((t) => !t.completed && !!t.alarmSet).length;
  }, [allScenarioTasks]);

  const noiseReductionRate = useMemo(() => {
    const rate = (currentScenario.noiseFilteredCount / currentScenario.totalMessages) * 100;
    return rate.toFixed(1);
  }, [currentScenario]);

  // VOICE BRIEFING
  const handleToggleVoiceBriefing = () => {
    if (isVoicePlaying) {
      window.speechSynthesis?.cancel();
      setIsVoicePlaying(false);
      addToast('Voice Briefing Paused', 'Audio digest stopped.', 'info');
      return;
    }

    if (!('speechSynthesis' in window)) {
      addToast('Audio Not Supported', 'Web Speech API is unavailable in this browser.', 'info');
      return;
    }

    window.speechSynthesis.cancel();

    const script =
      `CatchUp AI Voice Briefing for ${currentScenario.name}. ` +
      `Here is what you missed. ` +
      currentScenario.briefing.brief.join('. ') +
      `. You have ${unreadMentionsCount} direct mentions, including pings from leadership. ` +
      `Urgent action items pending: ${urgentTasksCount}.`;

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.volume = voiceVolume;
    utterance.rate = voiceRate;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel') ||
          v.name.includes('Alex'))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => {
      setIsVoicePlaying(true);
      addToast('Voice Briefing Started', `Streaming audio digest for "${currentScenario.name}".`, 'info');
    };
    utterance.onend = () => setIsVoicePlaying(false);
    utterance.onerror = () => setIsVoicePlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync handler
  const handleSyncNow = () => {
    setIsSyncing(true);
    addToast('Sync Triggered', 'Polling local sockets across Slack, Telegram, Discord & Email...', 'info');
    setTimeout(() => {
      setIsSyncing(false);
      addToast('Sync Complete', `Processed ${currentScenario.totalMessages} raw chat packets. Zero cloud leakage.`, 'success');
    }, 1200);
  };

  // Simulate urgent inflow
  const handleSimulateUrgentInflow = () => {
    const urgentMessage =
      activeScenarioId === 'outage'
        ? 'HOD & CTO Sarah Jenkins: Customer checkout failure rate exceeded 18%! Kill rogue queries immediately!'
        : activeScenarioId === 'design'
        ? 'HOD Chloe Lin: Critical navigation drawer clipping reported by QA testing squad!'
        : 'Principal Director Cole: Catering vendor cutoff in 15 minutes! Confirm headcount!';

    addToast('Leadership Urgent Alert', urgentMessage, 'urgent');
    playAlarmSound('emergency', alarmVolume);
  };

  // Toggle task
  const handleToggleTask = (taskId: string) => {
    setScenarioTasks((prev) => ({
      ...prev,
      [activeScenarioId]: prev[activeScenarioId].map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    }));
    const task = allScenarioTasks.find((t) => t.id === taskId);
    if (task && !task.completed) {
      addToast('Task Resolved', `Marked "${task.title}" as complete.`, 'success');
    }
  };

  // Save Alarm
  const handleSaveAlarm = (taskId: string, minutesBefore: number, label: string) => {
    setScenarioTasks((prev) => ({
      ...prev,
      [activeScenarioId]: prev[activeScenarioId].map((t) =>
        t.id === taskId
          ? {
              ...t,
              alarmSet: {
                minutesBefore,
                label,
                sound: soundEnabled,
                chimeType: globalChimeType,
              },
            }
          : t
      ),
    }));
    setSettingAlarmTask(null);
    playAlarmSound(globalChimeType, alarmVolume);
    addToast('Alarm Armed', `Reminder set: ${label} for deadline.`, 'success');
  };

  // Remove Alarm
  const handleRemoveAlarm = (taskId: string) => {
    setScenarioTasks((prev) => ({
      ...prev,
      [activeScenarioId]: prev[activeScenarioId].map((t) =>
        t.id === taskId ? { ...t, alarmSet: undefined } : t
      ),
    }));
    setSettingAlarmTask(null);
    addToast('Alarm Cancelled', 'Deadline reminder has been removed.', 'info');
  };

  // Trigger Alarm Test
  const handleTriggerAlarmTest = (taskTitle: string, channel: string, deadlineMinutes: number) => {
    playAlarmSound(globalChimeType, alarmVolume);
    setTriggeredAlarm({
      taskTitle,
      channel,
      deadlineMinutes,
    });
  };

  // Snooze task
  const handleSnoozeTask = (taskId: string, extraMinutes: number) => {
    setScenarioTasks((prev) => ({
      ...prev,
      [activeScenarioId]: prev[activeScenarioId].map((t) =>
        t.id === taskId
          ? {
              ...t,
              deadlineMinutes: t.deadlineMinutes + extraMinutes,
              snoozedCount: t.snoozedCount + 1,
            }
          : t
      ),
    }));
    addToast('Deadline Snoozed', `Extended deadline by +${extraMinutes} minutes.`, 'info');
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const task = allScenarioTasks.find((t) => t.id === taskId);
    setScenarioTasks((prev) => ({
      ...prev,
      [activeScenarioId]: prev[activeScenarioId].filter((t) => t.id !== taskId),
    }));
    if (task) {
      addToast('Task Removed', `Deleted "${task.title}".`, 'info');
    }
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = (alertId: string) => {
    setScenarioAlerts((prev) => ({
      ...prev,
      [activeScenarioId]: prev[activeScenarioId].map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
    }));
    addToast('Alert Acknowledged', 'Emergency incident marked under active investigation.', 'success');
  };

  // Acknowledge direct mention
  const handleAcknowledgeMention = (mentionId: string) => {
    setScenarioMentions((prev) => ({
      ...prev,
      [activeScenarioId]: prev[activeScenarioId].map((m) =>
        m.id === mentionId ? { ...m, acknowledged: !m.acknowledged } : m
      ),
    }));
    addToast('Mention Acknowledged', 'Direct ping marked as read.', 'success');
  };

  // Open Raw Context
  const openRawContextInspector = (title: string, source: string) => {
    setRawContextData({
      title,
      source,
      messages: currentScenario.rawMessages,
    });
  };

  // Copy Draft
  const [copiedDraftIndex, setCopiedDraftIndex] = useState<string | null>(null);
  const handleCopyDraft = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftIndex(key);
    addToast('Copied to Clipboard', 'AI assist draft ready to paste into chat.', 'success');
    setTimeout(() => {
      setCopiedDraftIndex(null);
    }, 2000);
  };

  // Load sample import chat
  const handleLoadSampleChat = (sampleType: 'hod' | 'telegram') => {
    if (sampleType === 'hod') {
      setImportChatText(
        `[14:02:15, 10/09/2026] Dr. Sarah Jenkins (HOD & CTO): @Alex Chen API Gateway error rate is spiking past 14%. Need your eyes on DB connection locks now.\n` +
        `[14:04:30, 10/09/2026] Marcus Vance (Principal Systems Architect): @Alex I checked RDS; PID 48291 has an exclusive lock on customer_wallets table.\n` +
        `[14:08:12, 10/09/2026] Dr. Sarah Jenkins (HOD & CTO): If we don't kill PID 48291 in 10 minutes we risk enterprise checkout SLA penalties. Please execute pg_terminate_backend.\n` +
        `[14:15:00, 10/09/2026] Alex Chen (Principal Engineer): Terminated PID 48291. Connection count dropped from 100 to 38. Latency returning to 110ms.`
      );
    } else {
      setImportChatText(
        `[10:15:00] Chloe Lin (HOD Product Design): @Alex Chen The design system tokens v2.4 have been updated in Figma.\n` +
        `[10:30:20] Marcus Vance (Head of Product & Web): @Alex Please audit the mobile navigation tap targets for 44px compliance before the sprint cut.`
      );
    }
    addToast('Sample Chat Loaded', 'Sample text populated from HOD & Principal leaders.', 'info');
  };

  // Process & Ingest Imported Chat
  const handleProcessImportedChat = () => {
    if (!importChatText.trim()) {
      addToast('Input Required', 'Please paste chat text or select a sample chat first.', 'info');
      return;
    }

    // Add a new direct mention and task simulated from the imported chat
    const newMention: DirectMentionItem = {
      id: `imported-${Date.now()}`,
      sender: 'Dr. Sarah Jenkins',
      role: 'HOD & VP of Engineering / CTO',
      avatar: 'SJ',
      channel: 'Imported WhatsApp Chat',
      sourceType: 'Telegram',
      timestamp: 'Just now',
      text: '@Alex Chen Direct ping from imported transcript: Verify database statement_timeout parameters.',
      isUrgent: true,
      isLeadership: true,
      acknowledged: false,
    };

    setScenarioMentions((prev) => ({
      ...prev,
      [activeScenarioId]: [newMention, ...prev[activeScenarioId]],
    }));

    setIsImportModalOpen(false);
    setImportChatText('');
    addToast(
      'Chat Ingested Successfully',
      'Extracted 1 Direct Mention from HOD and verified leadership signatures.',
      'success'
    );
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ========================================================= */}
      {/* 1. TOP HEADER                                             */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between gap-3">
        {/* Left: Brand Wordmark (No timer) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                CatchUp AI
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                Local Shield
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Privacy-preserving unread chat digest
            </p>
          </div>
        </div>

        {/* Center: Search & Command Palette Trigger */}
        <div className="flex-1 max-w-sm hidden md:flex items-center">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search unread streams, mentions...</span>
            </div>
            <kbd className="font-mono text-[10px] bg-slate-800/80 border border-slate-700/80 px-1.5 py-0.5 rounded text-slate-300">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Controls: Import Chats, Voice Briefing, Alarm Settings, Urgent Only */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* IMPORT CHATS BUTTON (Changed from Export Chats as requested!) */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-cyan-500/40 hover:border-cyan-500/70 text-cyan-300 hover:text-cyan-200 rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-cyan-950"
            title="Import WhatsApp, Telegram or Slack chat logs"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Chats</span>
          </button>

          {/* VOICE BRIEFING AUDIO BUTTON */}
          <button
            onClick={handleToggleVoiceBriefing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isVoicePlaying
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 hover:text-cyan-300'
            }`}
            title="Listen to synthesized audio voice briefing"
          >
            {isVoicePlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Voice Briefing</span>
              </>
            )}
          </button>

          {/* EDIT ALARM SETTINGS PAGE BUTTON */}
          <button
            onClick={() => setIsAlarmSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-cyan-300 rounded-lg text-xs font-medium transition-colors"
            title="Edit Alarm & Reminder Settings"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Alarm Settings</span>
          </button>

          {/* URGENT-ONLY FILTER SWITCH */}
          <button
            onClick={() => {
              const nextState = !urgentOnlyFilter;
              setUrgentOnlyFilter(nextState);
              addToast(
                nextState ? 'Urgent Only Active' : 'Showing All Items',
                nextState
                  ? 'Silencing non-critical chatter. Only urgent tasks, alerts, and mentions are shown.'
                  : 'Displaying complete stream feeds and routine tasks.',
                nextState ? 'urgent' : 'info'
              );
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              urgentOnlyFilter
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Urgent Only Mode"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${urgentOnlyFilter ? 'text-rose-400' : 'text-slate-400'}`} />
            <span className="font-semibold">{urgentOnlyFilter ? 'Urgent Mode ON' : 'Urgent Only'}</span>
          </button>

          {/* Profile / Enclave */}
          {isAuthenticated && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
              title="Security Enclave"
            >
              <div className="w-7 h-7 rounded-full bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center text-xs font-mono text-cyan-300">
                {activeUser.avatar}
              </div>
            </button>
          )}
        </div>
      </header>

      {/* Voice Briefing Waveform Bar */}
      {isVoicePlaying && (
        <div className="bg-cyan-950/80 border-b border-cyan-800/80 px-4 py-2 flex items-center justify-between text-xs text-cyan-200">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-medium">
              Audio Briefing Active: Speaking key incident takeaways & tasks...
            </span>
          </div>
          <button
            onClick={handleToggleVoiceBriefing}
            className="px-2 py-0.5 rounded bg-cyan-900 hover:bg-cyan-800 text-cyan-200 font-mono text-xs"
          >
            Stop Audio
          </button>
        </div>
      )}

      {/* Urgent Only Mode Banner */}
      {urgentOnlyFilter && (
        <div className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-2 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="font-semibold">
              URGENT FILTER ACTIVE: Silencing routine conversations. Showing {visibleTasks.length} Urgent Tasks and {visibleMentions.length} Mentions.
            </span>
          </div>
          <button
            onClick={() => setUrgentOnlyFilter(false)}
            className="px-2.5 py-0.5 bg-rose-900 hover:bg-rose-850 rounded text-rose-100 font-medium text-xs"
          >
            Show All
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. STATISTICS BANNER (Clean metrics, no P0/P1 codes)       */}
      {/* ========================================================= */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 px-4 lg:px-8 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
          {/* Unread Messages */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Unread Messages</div>
              <div className="text-lg font-bold font-mono text-white tabular-nums">
                {currentScenario.totalMessages}
              </div>
            </div>
          </div>

          {/* Direct Mentions (New Dedicated Metric!) */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400">
              <AtSign className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Direct Mentions</div>
              <div className="text-lg font-bold font-mono text-amber-300 tabular-nums flex items-center gap-1.5">
                <span>{allScenarioMentions.length} Pings</span>
                <span className="text-[10px] text-amber-400/80 font-normal">
                  (HOD / Head)
                </span>
              </div>
            </div>
          </div>

          {/* Urgent Tasks */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Urgent Tasks</div>
              <div className="text-lg font-bold font-mono text-rose-400 tabular-nums">
                {urgentTasksCount}{' '}
                <span className="text-[10px] text-slate-400 font-normal">
                  / {allScenarioTasks.length} total
                </span>
              </div>
            </div>
          </div>

          {/* Active Alarms */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAlarmSettingsOpen(true)}
              className="w-9 h-9 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 flex items-center justify-center text-cyan-400 transition-colors"
              title="Click to edit alarm settings"
            >
              <AlarmClock className="w-4 h-4 text-cyan-400" />
            </button>
            <div
              className="cursor-pointer"
              onClick={() => setIsAlarmSettingsOpen(true)}
            >
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <span>Active Alarms</span>
                <Settings className="w-2.5 h-2.5 text-cyan-400" />
              </div>
              <div className="text-lg font-bold font-mono text-cyan-300 tabular-nums flex items-center gap-1.5">
                <span>{activeAlarmsCount} Set</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Audio armed)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Triggered Alarm Banner */}
      {triggeredAlarm && (
        <div className="bg-rose-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-xl z-50 animate-bounce">
          <div className="flex items-center gap-3">
            <BellRing className="w-6 h-6 animate-pulse" />
            <div>
              <div className="font-bold text-sm">
                🚨 DEADLINE ALARM: {triggeredAlarm.taskTitle}
              </div>
              <div className="text-xs text-rose-100">
                Source: {triggeredAlarm.channel} · Deadline approaching!
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTriggeredAlarm(null);
                addToast('Alarm Snoozed', 'Snoozed alarm by 5 minutes.', 'info');
              }}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold"
            >
              Snooze 5m
            </button>
            <button
              onClick={() => setTriggeredAlarm(null)}
              className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 rounded text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Mobile Tab Navigator */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-1">
        <button
          onClick={() => setMobileTab('sources')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mobileTab === 'sources'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Streams
        </button>
        <button
          onClick={() => setMobileTab('briefing')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mobileTab === 'briefing'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Digest & Mentions
        </button>
        <button
          onClick={() => setMobileTab('actions')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mobileTab === 'actions'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Action Hub ({visibleTasks.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* 3. 3-PANE WORKSPACE LAYOUT                                */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ------------------------------------------------------- */}
        {/* LEFT PANE: SMART SOURCES                               */}
        {/* ------------------------------------------------------- */}
        <aside
          className={`w-full lg:w-72 xl:w-80 bg-slate-950/80 border-r border-slate-800/80 flex flex-col shrink-0 overflow-y-auto ${
            mobileTab === 'sources' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Connected Streams
              </h2>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Local Ingestion Active</span>
              </div>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-slate-600 rounded-md text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
              title="Poll local chat sockets"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1">
            {/* Slack */}
            <div
              onClick={() => setSelectedSourceFilter(selectedSourceFilter === 'slack' ? null : 'slack')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedSourceFilter === 'slack'
                  ? 'bg-slate-900/90 border-cyan-500/50 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-300 font-bold text-xs">
                    #
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Slack</span>
                    <div className="text-[10px] text-slate-400">
                      {currentScenario.sources.slack.channel}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-white tabular-nums bg-purple-900/40 border border-purple-700/40 px-1.5 py-0.5 rounded">
                  {currentScenario.sources.slack.unread}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-purple-400 transition-all duration-500"
                  style={{ width: `${currentScenario.sources.slack.urgency}%` }}
                />
              </div>
            </div>

            {/* Telegram */}
            <div
              onClick={() => setSelectedSourceFilter(selectedSourceFilter === 'telegram' ? null : 'telegram')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedSourceFilter === 'telegram'
                  ? 'bg-slate-900/90 border-sky-500/50 ring-1 ring-sky-500/30'
                  : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-sky-950/70 border border-sky-800/70 flex items-center justify-center text-sky-400 font-bold text-xs">
                    <Send className="w-3.5 h-3.5 -rotate-12 translate-x-px" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Telegram</span>
                    <div className="text-[10px] text-slate-400">
                      {currentScenario.sources.telegram.channel}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-white tabular-nums bg-sky-900/50 border border-sky-700/50 px-1.5 py-0.5 rounded">
                  {currentScenario.sources.telegram.unread}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-sky-400 transition-all duration-500"
                  style={{ width: `${currentScenario.sources.telegram.urgency}%` }}
                />
              </div>
            </div>

            {/* Discord */}
            <div
              onClick={() => setSelectedSourceFilter(selectedSourceFilter === 'discord' ? null : 'discord')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedSourceFilter === 'discord'
                  ? 'bg-slate-900/90 border-cyan-500/50 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-300 font-bold text-xs">
                    D
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Discord</span>
                    <div className="text-[10px] text-slate-400">
                      {currentScenario.sources.discord.channel}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-white tabular-nums bg-indigo-900/40 border border-indigo-700/40 px-1.5 py-0.5 rounded">
                  {currentScenario.sources.discord.unread}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-indigo-400 transition-all duration-500"
                  style={{ width: `${currentScenario.sources.discord.urgency}%` }}
                />
              </div>
            </div>

            {/* Email */}
            <div
              onClick={() => setSelectedSourceFilter(selectedSourceFilter === 'email' ? null : 'email')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedSourceFilter === 'email'
                  ? 'bg-slate-900/90 border-cyan-500/50 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-300 font-bold text-xs">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Email</span>
                    <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      {currentScenario.sources.email.channel}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-white tabular-nums bg-blue-900/40 border border-blue-700/40 px-1.5 py-0.5 rounded">
                  {currentScenario.sources.email.unread}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-blue-400 transition-all duration-500"
                  style={{ width: `${currentScenario.sources.email.urgency}%` }}
                />
              </div>
            </div>
          </div>

          {/* Import Chats Action Button in Left Sidebar (Changed as requested!) */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 space-y-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-800/60 rounded-lg text-xs font-semibold text-cyan-300 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Chats</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Paste or ingest raw WhatsApp, Telegram or Slack chat logs.
            </p>
          </div>
        </aside>

        {/* ------------------------------------------------------- */}
        {/* CENTER PANE: NEURAL PROCESSING CONSOLE & DIGEST FEED   */}
        {/* ------------------------------------------------------- */}
        <section
          className={`flex-1 flex flex-col bg-slate-950 overflow-y-auto ${
            mobileTab === 'briefing' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Top Control Bar: Scenario Switcher & Summary Mode */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => {
                  setActiveScenarioId('outage');
                  addToast('Scenario Activated', 'Loaded "Production Outage" stream.', 'info');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeScenarioId === 'outage'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Production Outage
              </button>
              <button
                onClick={() => {
                  setActiveScenarioId('design');
                  addToast('Scenario Activated', 'Loaded "Design Sync" sprint stream.', 'info');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeScenarioId === 'design'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Design Sync
              </button>
              <button
                onClick={() => {
                  setActiveScenarioId('casual');
                  addToast('Scenario Activated', 'Loaded "Casual Chatter" watercooler stream.', 'info');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeScenarioId === 'casual'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Casual Chatter
              </button>
            </div>

            {/* Brief / Detailed Toggle */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setSummaryMode('brief')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  summaryMode === 'brief'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Brief Mode
              </button>
              <button
                onClick={() => setSummaryMode('detailed')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  summaryMode === 'detailed'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Detailed Mode
              </button>
            </div>
          </div>

          {/* Neural Processing Canvas */}
          <div className="px-4 pt-4">
            <NeuralStreamCanvas
              scenario={currentScenario}
              isSyncing={isSyncing}
              urgentOnly={urgentOnlyFilter}
            />
          </div>

          {/* ========================================================= */}
          {/* SEPARATE BLOCK FOR DIRECT MENTIONS (Requested!)           */}
          {/* ========================================================= */}
          <div className="px-4 sm:px-6 pt-5">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <AtSign className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Direct Mentions & Leadership Pings</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 lowercase">
                        {visibleMentions.length} unread
                      </span>
                    </h2>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-300 font-medium">HOD / Head / Principal highlighted</span>
                </div>
              </div>

              {/* Mentions list cards */}
              <div className="space-y-2.5">
                {visibleMentions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 italic bg-slate-950/60 rounded-lg">
                    No direct mentions detected in this stream.
                  </div>
                ) : (
                  visibleMentions.map((mention) => (
                    <div
                      key={mention.id}
                      className={`p-3 rounded-xl border transition-all ${
                        mention.acknowledged
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : mention.isLeadership
                          ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* SENDER NAME HIGHLIGHTED IF AUTHENTIC PERSON (HOD/HEAD/PRINCIPAL) */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold ${
                                isAuthenticLeader(mention.role)
                                  ? 'text-amber-300 underline decoration-amber-500/60 underline-offset-2'
                                  : 'text-slate-200'
                              }`}
                            >
                              {mention.sender}
                            </span>

                            {/* AUTHENTIC LEADERSHIP BADGE */}
                            {isAuthenticLeader(mention.role) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm">
                                <Crown className="w-2.5 h-2.5 text-amber-400" />
                                <span>{mention.role}</span>
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-slate-400">
                            in {mention.channel}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {mention.isUrgent && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Urgent
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            {mention.timestamp}
                          </span>
                        </div>
                      </div>

                      {/* Mention message content */}
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {mention.text}
                      </p>

                      {/* Action buttons */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`Acknowledged: On it right now.`);
                            addToast('Draft Copied', 'Quick acknowledgment copied to clipboard.', 'success');
                          }}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>AI Quick Reply</span>
                        </button>

                        <button
                          onClick={() => handleAcknowledgeMention(mention.id)}
                          className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors ${
                            mention.acknowledged
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50'
                          }`}
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>{mention.acknowledged ? 'Acknowledged' : 'Mark Acknowledged'}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Catch-Up Briefing Content */}
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    {currentScenario.name}
                  </h1>
                  {activeScenarioId === 'outage' && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Urgent Incident
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {currentScenario.subtitle} · Digested from Slack, Telegram, Discord, Email
                </p>
              </div>

              {/* Action Buttons: Voice Briefing & Inspect Raw Transcript */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleVoiceBriefing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/70 text-cyan-300 text-xs font-medium rounded-lg transition-colors"
                >
                  <Mic className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isVoicePlaying ? 'Pause Audio' : 'Play Audio Briefing'}</span>
                </button>

                <button
                  onClick={() =>
                    openRawContextInspector(
                      `${currentScenario.name} — Raw Transcript`,
                      currentScenario.subtitle
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-medium text-slate-300 rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Raw Chat Logs</span>
                </button>
              </div>
            </div>

            {/* Brief Mode Render */}
            {summaryMode === 'brief' && (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Executive Briefing Digest</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {currentScenario.briefing.brief.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Mode Render */}
            {summaryMode === 'detailed' && (
              <div className="space-y-5">
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Executive Narrative
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {currentScenario.briefing.detailed.executiveDigest}
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Root Cause Investigation
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed font-mono text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {currentScenario.briefing.detailed.rootCauseAnalysis}
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Stakeholder Timeline (Leadership Attribution)
                  </h3>
                  <div className="space-y-2.5 pt-1">
                    {currentScenario.briefing.detailed.stakeholderTimeline.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400">{item.time}</span>
                            <span
                              className={`text-xs font-semibold ${
                                isAuthenticLeader(item.actor)
                                  ? 'text-amber-300 flex items-center gap-1 font-bold'
                                  : 'text-cyan-300'
                              }`}
                            >
                              {isAuthenticLeader(item.actor) && <Crown className="w-3 h-3 text-amber-400" />}
                              <span>{item.actor}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">{item.action}</p>
                        </div>
                        <button
                          onClick={() =>
                            openRawContextInspector(`Citation: ${item.citation}`, item.action)
                          }
                          className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
                        >
                          <span>[{item.citation}]</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------- */}
        {/* RIGHT PANE: ACTION, DECISIONS & ALARMS HUB              */}
        {/* ------------------------------------------------------- */}
        <aside
          className={`w-full lg:w-80 xl:w-96 bg-slate-950/90 border-l border-slate-800/80 flex flex-col shrink-0 overflow-y-auto ${
            mobileTab === 'actions' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Categorized Tabs Header */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-950">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setRightPaneTab('tasks')}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  rightPaneTab === 'tasks'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Tasks</span>
                <span className="font-mono text-[10px] bg-slate-700/60 px-1 rounded text-slate-300">
                  {visibleTasks.length}
                </span>
              </button>

              <button
                onClick={() => setRightPaneTab('mentions')}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  rightPaneTab === 'mentions'
                    ? 'bg-slate-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>@ Mentions</span>
                <span className="font-mono text-[10px] bg-amber-950 text-amber-300 px-1 rounded border border-amber-800/50">
                  {unreadMentionsCount}
                </span>
              </button>

              <button
                onClick={() => setRightPaneTab('decisions')}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  rightPaneTab === 'decisions'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Decisions</span>
                <span className="font-mono text-[10px] bg-slate-700/60 px-1 rounded text-slate-300">
                  {visibleDecisions.length}
                </span>
              </button>

              <button
                onClick={() => setRightPaneTab('alerts')}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  rightPaneTab === 'alerts'
                    ? 'bg-slate-800 text-rose-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Alerts</span>
                <span className="font-mono text-[10px] bg-rose-950 text-rose-300 px-1 rounded border border-rose-800/50">
                  {visibleAlerts.length}
                </span>
              </button>
            </div>
          </div>

          {/* Right Pane Body */}
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* TAB 1: TASKS */}
            {rightPaneTab === 'tasks' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    {urgentOnlyFilter ? '🚨 Urgent Tasks Only' : 'Action Queue'}
                  </span>
                  <button
                    onClick={() => setIsAlarmSettingsOpen(true)}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Alarm Settings</span>
                  </button>
                </div>

                {visibleTasks.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-medium">
                      {urgentOnlyFilter ? 'No Urgent Tasks Found' : 'All tasks cleared!'}
                    </p>
                  </div>
                ) : (
                  visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        task.completed
                          ? 'bg-slate-900/30 border-slate-800/40 opacity-60'
                          : task.isUrgent
                          ? 'bg-rose-950/20 border-rose-800/50'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              task.isUrgent
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {task.isUrgent ? 'Urgent Task' : 'Normal Task'}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {task.sourceChannel}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                          <span className={task.isUrgent ? 'text-rose-400 font-semibold' : ''}>
                            Due in {task.deadlineMinutes < 60
                              ? `${task.deadlineMinutes}m`
                              : `${Math.floor(task.deadlineMinutes / 60)}h ${task.deadlineMinutes % 60}m`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.id)}
                          className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p
                            className={`text-xs font-medium leading-snug ${
                              task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                            }`}
                          >
                            {task.title}
                          </p>
                        </div>
                      </div>

                      {task.alarmSet && !task.completed && (
                        <div className="mt-2.5 px-2 py-1 bg-cyan-950/60 border border-cyan-800/60 rounded-md flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-cyan-300 font-medium font-mono">
                            <AlarmClockCheck className="w-3 h-3 text-cyan-400" />
                            <span>Alarm: {task.alarmSet.label}</span>
                          </div>
                          <button
                            onClick={() =>
                              handleTriggerAlarmTest(task.title, task.sourceChannel, task.deadlineMinutes)
                            }
                            className="text-cyan-400 hover:text-white underline text-[9px]"
                          >
                            Test Chime
                          </button>
                        </div>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSettingAlarmTask(task)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                              task.alarmSet
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700'
                            }`}
                          >
                            <AlarmClock className="w-3 h-3 text-cyan-400" />
                            <span>{task.alarmSet ? 'Alarm Active' : 'Set Alarm'}</span>
                          </button>

                          <button
                            onClick={() => setAiAssistTask(task)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-800/60 text-cyan-300 text-[11px] font-medium transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span>AI Assist</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSnoozeTask(task.id, 30)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-[10px] transition-colors"
                          >
                            +30m
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: DIRECT MENTIONS TAB */}
            {rightPaneTab === 'mentions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Direct @Mentions
                  </span>
                  <span className="text-[11px] text-amber-300 font-mono">
                    {unreadMentionsCount} Unread
                  </span>
                </div>

                <div className="space-y-2.5">
                  {visibleMentions.map((mention) => (
                    <div
                      key={mention.id}
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        mention.isLeadership
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isAuthenticLeader(mention.role) ? 'text-amber-300' : 'text-slate-200'
                            }`}
                          >
                            {mention.sender}
                          </span>
                          {isAuthenticLeader(mention.role) && (
                            <Crown className="w-3 h-3 text-amber-400" />
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {mention.timestamp}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {mention.role} · {mention.channel}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {mention.text}
                      </p>
                      <div className="pt-2 flex items-center justify-between">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`Noted. Following up now.`);
                            addToast('Copied', 'Quick acknowledgment copied.', 'success');
                          }}
                          className="text-[11px] text-cyan-400 hover:underline"
                        >
                          Quick Ack
                        </button>
                        <button
                          onClick={() => handleAcknowledgeMention(mention.id)}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          {mention.acknowledged ? 'Mark Unread' : 'Acknowledge'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: KEY DECISIONS */}
            {rightPaneTab === 'decisions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Decisions & Proposals
                  </span>
                  <span className="text-[11px]">{visibleDecisions.length} recorded</span>
                </div>

                <div className="space-y-3">
                  {visibleDecisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${
                            decision.type === 'decided'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {decision.type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {decision.timestamp}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200 leading-snug">
                        {decision.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {decision.detail}
                      </p>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span>By: {decision.decidedBy}</span>
                          {decision.role && isAuthenticLeader(decision.role) && (
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                          )}
                        </span>
                        <button
                          onClick={() =>
                            openRawContextInspector(`Decision: ${decision.title}`, decision.detail)
                          }
                          className="text-cyan-400 hover:underline flex items-center gap-0.5 font-mono"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: URGENT ALERTS */}
            {rightPaneTab === 'alerts' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Emergency Triage Desk
                  </span>
                  <span className="text-[11px]">{visibleAlerts.length} active</span>
                </div>

                {visibleAlerts.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-300 font-medium">No Active Emergencies</p>
                    <p className="text-[11px] text-slate-500 mt-1">All streams within nominal SLA.</p>
                  </div>
                ) : (
                  visibleAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        alert.acknowledged
                          ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                          : 'bg-rose-950/20 border-rose-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Urgent Alert
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {alert.timestamp}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-rose-200 leading-snug">
                        {alert.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {alert.summary}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                        <button
                          onClick={() =>
                            openRawContextInspector(`Alert: ${alert.title}`, alert.summary)
                          }
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Context</span>
                        </button>

                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          disabled={alert.acknowledged}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            alert.acknowledged
                              ? 'bg-slate-800 text-slate-400 cursor-default'
                              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                          }`}
                        >
                          {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* ========================================================= */}
      {/* 4. MODALS & PAGES                                         */}
      {/* ========================================================= */}

      {/* DEDICATED MODAL: IMPORT CHATS (Changed as requested!) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Import Chats & Leadership Feeds</h3>
                  <p className="text-xs text-slate-400">
                    Ingest exported chat logs from WhatsApp, Telegram, or Slack for local summarization
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Stream Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  1. Source Format:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setImportSourceType('whatsapp')}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-colors ${
                      importSourceType === 'whatsapp'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    WhatsApp (.txt export)
                  </button>
                  <button
                    onClick={() => setImportSourceType('telegram')}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-colors ${
                      importSourceType === 'telegram'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Telegram Chat Log
                  </button>
                  <button
                    onClick={() => setImportSourceType('slack')}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-colors ${
                      importSourceType === 'slack'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Slack Transcript
                  </button>
                </div>
              </div>

              {/* Sample Loader Buttons (Easy 1-Click Testing) */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Quick Test Samples:</span>
                  <span className="text-[10px] text-amber-400">Includes HOD / Principal mentions</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleLoadSampleChat('hod')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs text-amber-300 font-medium flex items-center gap-1"
                  >
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>Load WhatsApp Chat from HOD</span>
                  </button>
                  <button
                    onClick={() => handleLoadSampleChat('telegram')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs text-sky-300 font-medium"
                  >
                    Load Telegram Academic Sync
                  </button>
                </div>
              </div>

              {/* Textarea Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                  2. Paste Raw Chat Export Text:
                </label>
                <textarea
                  value={importChatText}
                  onChange={(e) => setImportChatText(e.target.value)}
                  placeholder="Paste chat text here (e.g. [14:02] Dr. Sarah Jenkins (HOD): @Alex please check API error rate...)"
                  className="w-full h-36 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                100% On-device parsing · Zero external servers
              </span>
              <button
                onClick={handleProcessImportedChat}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Digest & Analyze Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALARM SETTINGS MODAL */}
      {isAlarmSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shadow-sm">
                  <AlarmClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Alarm & Notification Settings</h3>
                  <p className="text-xs text-slate-400">
                    Configure deadline lead-time, audio chime pattern, and sound volume
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAlarmSettingsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200">Default Alarm Lead-Time</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[0, 5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setDefaultLeadMinutes(mins)}
                      className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-colors ${
                        defaultLeadMinutes === mins
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {mins === 0 ? 'At Deadline' : `${mins}m Before`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200">Alarm Audio Chime Pattern</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { id: 'two-tone' as AlarmChimeType, name: 'Two-Tone Chime', desc: 'Standard high-urgency' },
                    { id: 'emergency' as AlarmChimeType, name: 'Emergency Siren', desc: 'Critical incident alert' },
                    { id: 'gentle' as AlarmChimeType, name: 'Gentle Ping', desc: 'Subtle focus chime' },
                    { id: 'digital' as AlarmChimeType, name: 'Digital Beep', desc: 'Clean electronic pulse' },
                  ].map((chime) => (
                    <div
                      key={chime.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        globalChimeType === chime.id
                          ? 'bg-cyan-950/40 border-cyan-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => {
                          setGlobalChimeType(chime.id);
                          playAlarmSound(chime.id, alarmVolume);
                        }}
                      >
                        <div className="text-xs font-semibold">{chime.name}</div>
                        <div className="text-[10px] text-slate-400">{chime.desc}</div>
                      </div>
                      <button
                        onClick={() => {
                          setGlobalChimeType(chime.id);
                          playAlarmSound(chime.id, alarmVolume);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-cyan-300 font-medium"
                      >
                        Preview
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Alarm Volume Level</span>
                  <span className="font-mono text-cyan-400">{Math.round(alarmVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={alarmVolume}
                  onChange={(e) => setAlarmVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => playAlarmSound(globalChimeType, alarmVolume)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-200 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Sound</span>
              </button>
              <button
                onClick={() => {
                  setIsAlarmSettingsOpen(false);
                  addToast('Settings Saved', 'Alarm audio configuration updated.', 'success');
                }}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK TASK ALARM MODAL */}
      {settingAlarmTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <AlarmClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Set Deadline Alarm</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                    {settingAlarmTask.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettingAlarmTask(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Deadline:</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    In {settingAlarmTask.deadlineMinutes} minutes
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Choose Alarm Timing:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSaveAlarm(settingAlarmTask.id, 0, 'At Exact Deadline')}
                    className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-200 transition-colors"
                  >
                    <div className="font-medium">🔔 At Deadline</div>
                  </button>
                  <button
                    onClick={() => handleSaveAlarm(settingAlarmTask.id, 5, '5m Before Deadline')}
                    className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-200 transition-colors"
                  >
                    <div className="font-medium">⏱️ 5 Mins Before</div>
                  </button>
                  <button
                    onClick={() => handleSaveAlarm(settingAlarmTask.id, 15, '15m Before Deadline')}
                    className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-200 transition-colors"
                  >
                    <div className="font-medium">⏱️ 15 Mins Before</div>
                  </button>
                  <button
                    onClick={() => handleSaveAlarm(settingAlarmTask.id, 30, '30m Before Deadline')}
                    className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-200 transition-colors"
                  >
                    <div className="font-medium">⏱️ 30 Mins Before</div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                {settingAlarmTask.alarmSet ? (
                  <button
                    onClick={() => handleRemoveAlarm(settingAlarmTask.id)}
                    className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 rounded-lg text-xs font-medium"
                  >
                    Cancel Alarm
                  </button>
                ) : (
                  <span />
                )}
                <button
                  onClick={() =>
                    handleSaveAlarm(
                      settingAlarmTask.id,
                      defaultLeadMinutes,
                      `${defaultLeadMinutes}m Before Deadline`
                    )
                  }
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition-colors"
                >
                  Arm Alarm ({defaultLeadMinutes}m lead)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI ASSIST MODAL */}
      {aiAssistTask && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    AI Assist Copilot
                  </span>
                  <span className="text-xs text-slate-400">
                    Source: {aiAssistTask.sourceChannel}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {aiAssistTask.title}
                </h3>
              </div>
              <button
                onClick={() => setAiAssistTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Research & Background Brief</span>
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {aiAssistTask.aiAssist.backgroundBrief}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Action Plan Checklist</span>
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  {aiAssistTask.aiAssist.actionChecklist.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <span className="font-mono text-cyan-400 font-bold text-[11px] mt-0.5">
                        0{idx + 1}.
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ready-to-Use Draft Responses</span>
                </h4>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">Executive / Stakeholder Update</span>
                    <button
                      onClick={() =>
                        handleCopyDraft(aiAssistTask.aiAssist.drafts.stakeholder, 'draft-1')
                      }
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {copiedDraftIndex === 'draft-1' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 font-mono bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                    {aiAssistTask.aiAssist.drafts.stakeholder}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Generated locally using on-device quantized model
              </span>
              <button
                onClick={() => setAiAssistTask(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                Close Copilot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RAW MESSAGE CONTEXT INSPECTOR */}
      {rawContextData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60">
              <div>
                <h3 className="text-base font-bold text-white">{rawContextData.title}</h3>
                <p className="text-xs text-slate-400">{rawContextData.source}</p>
              </div>
              <button
                onClick={() => setRawContextData(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              {rawContextData.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-xl border space-y-1.5 ${
                    msg.isUrgent
                      ? 'bg-rose-950/20 border-rose-800/40'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-[10px] font-mono text-cyan-300 flex items-center justify-center font-bold">
                        {msg.avatar}
                      </div>
                      <span
                        className={`font-semibold ${
                          isAuthenticLeader(msg.role) ? 'text-amber-300 font-bold' : 'text-slate-200'
                        }`}
                      >
                        {msg.author}
                      </span>
                      {isAuthenticLeader(msg.role) && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5 text-amber-400" />
                          <span>{msg.role}</span>
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
              <button
                onClick={() => setRawContextData(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
              <Search className="w-4 h-4 text-cyan-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command, action, or scenario..."
                className="flex-1 bg-transparent border-0 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              <kbd className="font-mono text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400">
                ESC
              </kbd>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-1 text-xs">
              <button
                onClick={() => {
                  setIsImportModalOpen(true);
                  setIsCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 transition-colors"
              >
                <span>Import WhatsApp or Telegram Chats</span>
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button
                onClick={() => {
                  handleToggleVoiceBriefing();
                  setIsCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 transition-colors"
              >
                <span>Play / Pause Audio Voice Briefing</span>
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button
                onClick={() => {
                  setIsAlarmSettingsOpen(true);
                  setIsCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 transition-colors"
              >
                <span>Edit Alarm Settings</span>
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button
                onClick={() => {
                  setUrgentOnlyFilter(!urgentOnlyFilter);
                  setIsCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 transition-colors"
              >
                <span>Toggle Urgent-Only Mode ({urgentOnlyFilter ? 'ON' : 'OFF'})</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS DOCK */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all flex items-start justify-between gap-3 ${
              toast.type === 'urgent'
                ? 'bg-rose-950/90 border-rose-800 text-rose-100 shadow-rose-950/50'
                : toast.type === 'success'
                ? 'bg-slate-900/90 border-emerald-800/80 text-slate-100 shadow-emerald-950/40'
                : 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-cyan-950/30'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {toast.type === 'urgent' ? (
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              ) : toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h5 className="text-xs font-bold leading-tight">{toast.title}</h5>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  {toast.desc}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// NEURAL PARTICLE CANVAS VISUALIZER
// =========================================================
interface NeuralStreamCanvasProps {
  scenario: ScenarioData;
  isSyncing: boolean;
  urgentOnly: boolean;
}

function NeuralStreamCanvas({ scenario, isSyncing, urgentOnly }: NeuralStreamCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = 140);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 140;
    };
    window.addEventListener('resize', handleResize);

    const sources = [
      { name: 'Slack', y: height * 0.22, color: '#a855f7' },
      { name: 'Telegram', y: height * 0.42, color: '#38bdf8' },
      { name: 'Discord', y: height * 0.62, color: '#6366f1' },
      { name: 'Email', y: height * 0.82, color: '#3b82f6' },
    ];

    const centerNode = {
      x: width * 0.52,
      y: height * 0.5,
      radius: 24,
    };

    const outputTarget = {
      x: width - 20,
      y: height * 0.5,
    };

    interface Particle {
      x: number;
      y: number;
      sourceIndex: number;
      speed: number;
      progress: number;
      isNoise: boolean;
      color: string;
      size: number;
      reachedCenter: boolean;
      alpha: number;
    }

    const particles: Particle[] = [];
    const maxParticles = 48;

    const spawnParticle = () => {
      if (particles.length >= maxParticles) return;
      const sIdx = Math.floor(Math.random() * sources.length);
      const isNoise = Math.random() < 0.78;
      particles.push({
        x: 40,
        y: sources[sIdx].y,
        sourceIndex: sIdx,
        speed: (0.007 + Math.random() * 0.006) * (isSyncing ? 2.5 : 1) * speedMultiplier,
        progress: 0,
        isNoise,
        color: sources[sIdx].color,
        size: isNoise ? 2 : 3.5,
        reachedCenter: false,
        alpha: 1,
      });
    };

    let tick = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 35) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // Lines to center
      sources.forEach((s) => {
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(40, s.y);
        ctx.bezierCurveTo(
          width * 0.28,
          s.y,
          width * 0.38,
          centerNode.y,
          centerNode.x - centerNode.radius,
          centerNode.y
        );
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(40, s.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(s.name, 8, s.y + 3);
      });

      // Output stream line
      ctx.strokeStyle = urgentOnly ? 'rgba(244, 63, 94, 0.6)' : 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = urgentOnly ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(centerNode.x + centerNode.radius, centerNode.y);
      ctx.lineTo(outputTarget.x, outputTarget.y);
      ctx.stroke();

      ctx.fillStyle = urgentOnly ? '#f43f5e' : '#06b6d4';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(urgentOnly ? 'Urgent Only Output' : 'Actionable Digest', outputTarget.x - 120, outputTarget.y - 10);

      // Enclave Node
      const pulse = Math.sin(tick * 0.05) * 3;
      ctx.strokeStyle = urgentOnly ? '#f43f5e' : '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerNode.x, centerNode.y, centerNode.radius + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = urgentOnly ? '#f43f5e' : '#06b6d4';
      ctx.beginPath();
      ctx.arc(centerNode.x, centerNode.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 9px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('ENCLAVE', centerNode.x, centerNode.y + 16);
      ctx.textAlign = 'left';

      // Particles
      if (isRunning) {
        if (Math.random() < 0.4) spawnParticle();

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.progress += p.speed;

          if (p.progress < 0.5) {
            const t = p.progress / 0.5;
            const startY = sources[p.sourceIndex].y;
            p.x = 40 + t * (centerNode.x - 40);
            p.y = startY + t * (centerNode.y - startY);
          } else {
            p.reachedCenter = true;
            if (p.isNoise) {
              p.alpha -= 0.04;
              p.y += 0.8;
              p.x += (Math.random() - 0.5) * 1.5;
            } else {
              const t2 = (p.progress - 0.5) / 0.5;
              p.x = centerNode.x + t2 * (outputTarget.x - centerNode.x);
              p.y = centerNode.y;
              p.color = urgentOnly ? '#f43f5e' : '#06b6d4';
            }
          }

          if (p.alpha > 0.05) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.isNoise ? 'rgba(148, 163, 184, 0.4)' : p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          if (p.progress >= 1 || p.alpha <= 0.05) {
            particles.splice(i, 1);
          }
        }
      }

      tick++;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [scenario, isSyncing, isRunning, speedMultiplier, urgentOnly]);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 relative overflow-hidden">
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">
            Local Neural Flow & Noise Suppression
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
            0.00% Cloud Leakage
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-[10px] transition-colors"
          >
            {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : 1)}
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-[10px] font-mono transition-colors"
          >
            {speedMultiplier}x
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="w-full block" />

      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
            <span>Suppressed Noise</span>
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full inline-block ${urgentOnly ? 'bg-rose-500' : 'bg-cyan-400'}`} />
            <span>{urgentOnly ? 'Critical Urgent Only' : 'Actionable Digest'}</span>
          </span>
        </div>
        <div className="text-slate-500 hidden sm:block">
          Throughput: 128 msgs/sec · WebGPU AES-256
        </div>
      </div>
    </div>
  );
}
