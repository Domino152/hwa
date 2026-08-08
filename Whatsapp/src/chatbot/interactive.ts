/**
 * WhatsApp interactive message sender.
 * Sends List Messages (dropdown menus) and Reply Buttons using Baileys.
 *
 * Note: Baileys 6.x does not support `listMessage` / `interactiveMessage`
 * through the high-level `sendMessage` content API (they fall through to
 * media processing and throw "Invalid media type"). We build the raw proto
 * message with `generateWAMessageFromContent` and relay it with
 * `relayMessage`, which is the supported path for these types.
 */

import type { WASocket } from 'baileys';
import { proto, generateWAMessageFromContent } from 'baileys';
import logger from '../shared/utils/logger.js';

const interactiveLogger = logger.child({ module: 'interactive' });

export interface ButtonOption {
  id: string;
  text: string;
}

export interface ListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

/**
 * Send a list message (dropdown menu) to a WhatsApp user.
 * Falls back to plain text if the message type is not supported.
 */
export async function sendListMessage(
  sock: WASocket,
  jid: string,
  params: {
    title: string;
    description: string;
    buttonText: string;
    footerText?: string;
    sections: ListSection[];
  },
): Promise<string | null> {
  try {
    const message = proto.Message.fromObject({
      listMessage: {
        title: params.title,
        description: params.description,
        buttonText: params.buttonText,
        footerText: params.footerText ?? '',
        listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
        sections: params.sections.map((s) => ({
          title: s.title,
          rows: s.rows.map((r) => ({
            rowId: r.id,
            title: r.title,
            description: r.description ?? '',
          })),
        })),
      },
    });

    const fullMsg = generateWAMessageFromContent(jid, message, {
      userJid: sock.user?.id ?? '',
    });
    const messageId = (await sock.relayMessage(jid, fullMsg.message!, {
      messageId: fullMsg.key.id ?? undefined,
    })) ?? null;

    interactiveLogger.debug({ jid, messageId }, 'List message sent');
    return messageId;
  } catch (err) {
    interactiveLogger.warn({ jid, err }, 'Failed to send list message, falling back to text');
    return null;
  }
}

/**
 * Send reply buttons using nativeFlowMessage.
 * WhatsApp allows up to 3 buttons. Falls back to plain text if unsupported.
 */
export async function sendButtonsMessage(
  sock: WASocket,
  jid: string,
  params: {
    text: string;
    footerText?: string;
    buttons: ButtonOption[];
  },
): Promise<string | null> {
  try {
    const buttons = params.buttons.slice(0, 3).map((b) => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: b.text,
        id: b.id,
      }),
    }));

    const message = proto.Message.fromObject({
      interactiveMessage: {
        body: {
          text: params.text,
        },
        footer: params.footerText
          ? { text: params.footerText }
          : undefined,
        nativeFlowMessage: {
          buttons,
        },
      },
    });

    const fullMsg = generateWAMessageFromContent(jid, message, {
      userJid: sock.user?.id ?? '',
    });
    const messageId = (await sock.relayMessage(jid, fullMsg.message!, {
      messageId: fullMsg.key.id ?? undefined,
    })) ?? null;

    interactiveLogger.debug({ jid, messageId }, 'Buttons message sent');
    return messageId;
  } catch (err) {
    interactiveLogger.warn({ jid, err }, 'Failed to send buttons message, falling back to text');
    return null;
  }
}

/**
 * Send suggested quick-action buttons after a response.
 * Uses nativeFlowMessage for interactive quick replies.
 */
export async function sendSuggestedActions(
  sock: WASocket,
  jid: string,
  actions: ButtonOption[],
): Promise<string | null> {
  if (actions.length === 0) return null;

  return sendButtonsMessage(sock, jid, {
    text: '_Quick Actions:_',
    footerText: 'Tap an option or type a message',
    buttons: actions,
  });
}

/**
 * Build the main navigation list message.
 * Shows all available modules as a dropdown menu.
 */
export function buildMainMenuList(isAuthenticated: boolean): {
  title: string;
  description: string;
  buttonText: string;
  sections: ListSection[];
} {
  const sections: ListSection[] = [
    {
      title: '📚 Academic',
      rows: [
        { id: 'intent:attendance', title: '📊 Attendance', description: 'Check attendance percentage' },
        { id: 'intent:fees', title: '💰 Fees', description: 'View fee details & dues' },
        { id: 'intent:schedule', title: '📅 Timetable', description: 'See your class schedule' },
        { id: 'intent:results', title: '📝 Results', description: 'View exam results & CGPA' },
      ],
    },
    {
      title: '📢 Information',
      rows: [
        { id: 'intent:announcements', title: '📢 Announcements', description: 'College news & updates' },
        { id: 'intent:public_information', title: 'ℹ️ About HITS', description: 'College information' },
      ],
    },
  ];

  if (isAuthenticated) {
    sections.push({
      title: '👤 Account',
      rows: [
        { id: 'intent:profile', title: '👤 My Profile', description: 'View your profile' },
        { id: 'intent:help', title: '❓ Help', description: 'All available options' },
      ],
    });
  } else {
    sections.push({
      title: '🔐 Account',
      rows: [
        { id: 'intent:login', title: '🔑 Login', description: 'Sign in to your account' },
        { id: 'intent:help', title: '❓ Help', description: 'All available options' },
      ],
    });
  }

  return {
    title: '🎓 College AI Assistant',
    description: 'Select an option from the menu below:',
    buttonText: '📋 Browse Options',
    sections,
  };
}

/**
 * Get suggested quick-action buttons for a given intent.
 * These appear as quick-reply suggestions after the response.
 */
export function getSuggestedActions(intent: string, isAuthenticated: boolean): ButtonOption[] {
  const common: ButtonOption[] = [
    { id: 'intent:help', text: '❓ Help' },
  ];

  const privateActions: ButtonOption[] = [
    { id: 'intent:attendance', text: '📊 Attendance' },
    { id: 'intent:fees', text: '💰 Fees' },
    { id: 'intent:schedule', text: '📅 Timetable' },
    { id: 'intent:results', text: '📝 Results' },
  ];

  const publicActions: ButtonOption[] = [
    { id: 'intent:public_information', text: 'ℹ️ About HITS' },
    { id: 'intent:login', text: '🔑 Login' },
  ];

  const intentSuggestions: Record<string, ButtonOption[]> = {
    greeting: isAuthenticated ? privateActions.slice(0, 3) : publicActions,
    attendance: [
      { id: 'intent:schedule', text: '📅 Today\'s Classes' },
      { id: 'intent:results', text: '📝 Results' },
      ...common,
    ],
    fees: [
      { id: 'intent:attendance', text: '📊 Attendance' },
      { id: 'intent:results', text: '📝 Results' },
      ...common,
    ],
    schedule: [
      { id: 'intent:attendance', text: '📊 Attendance' },
      { id: 'intent:announcements', text: '📢 Announcements' },
      ...common,
    ],
    results: [
      { id: 'intent:attendance', text: '📊 Attendance' },
      { id: 'intent:schedule', text: '📅 Timetable' },
      ...common,
    ],
    public_information: [
      { id: 'intent:schedule', text: '📅 Timetable' },
      { id: 'intent:announcements', text: '📢 Announcements' },
      ...common,
    ],
    help: isAuthenticated ? privateActions : publicActions,
    unknown: isAuthenticated ? privateActions.slice(0, 3) : publicActions,
  };

  return intentSuggestions[intent] ?? (isAuthenticated
    ? [...privateActions.slice(0, 2), ...common]
    : publicActions);
}
