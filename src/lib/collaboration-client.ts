import type { CollaborationRole, TravelItem } from "./app-model";

const SESSION_PREFIX = "travelmate-collaboration-key:";
const INVITE_PREFIX = "travelmate-collaboration-invite:";

type CollaborationResponse = {
  travel: TravelItem;
  memberKey?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "协作服务暂时不可用，请稍后重试");
  }
  return payload;
}

export function getCollaborationKey(sharedTripId: string) {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(`${SESSION_PREFIX}${sharedTripId}`);
}

export function saveCollaborationKey(sharedTripId: string, memberKey: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${SESSION_PREFIX}${sharedTripId}`, memberKey);
}

export function getSavedCollaborationTripId(inviteCode: string) {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(`${INVITE_PREFIX}${inviteCode.toUpperCase()}`);
}

function saveInviteMapping(inviteCode: string, sharedTripId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${INVITE_PREFIX}${inviteCode.toUpperCase()}`, sharedTripId);
}

export async function createCollaboration(
  travel: TravelItem,
  inviteRole: Exclude<CollaborationRole, "owner">,
  ownerName = "我",
) {
  const payload = await readJson<CollaborationResponse>(
    await fetch("/api/collaboration/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ travel, inviteRole, ownerName }),
    }),
  );
  if (!payload.memberKey || !payload.travel.collaboration) {
    throw new Error("协作空间创建失败，请重试");
  }
  saveCollaborationKey(payload.travel.collaboration.sharedTripId, payload.memberKey);
  saveInviteMapping(
    payload.travel.collaboration.inviteCode,
    payload.travel.collaboration.sharedTripId,
  );
  return payload.travel;
}

export async function joinCollaboration(inviteCode: string, displayName: string) {
  const payload = await readJson<CollaborationResponse>(
    await fetch("/api/collaboration/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviteCode, displayName }),
    }),
  );
  if (!payload.memberKey || !payload.travel.collaboration) {
    throw new Error("加入协作旅行失败，请重试");
  }
  saveCollaborationKey(payload.travel.collaboration.sharedTripId, payload.memberKey);
  saveInviteMapping(
    payload.travel.collaboration.inviteCode,
    payload.travel.collaboration.sharedTripId,
  );
  return payload.travel;
}

export async function loadCollaboration(sharedTripId: string) {
  const memberKey = getCollaborationKey(sharedTripId);
  if (!memberKey) throw new Error("当前设备没有这次协作旅行的访问凭证");
  const payload = await readJson<CollaborationResponse>(
    await fetch(`/api/collaboration/trips/${encodeURIComponent(sharedTripId)}`, {
      headers: { "x-travelmate-member-key": memberKey },
      cache: "no-store",
    }),
  );
  return payload.travel;
}

export async function syncCollaboration(travel: TravelItem, action = "更新了旅行内容") {
  if (!travel.collaboration) return travel;
  const memberKey = getCollaborationKey(travel.collaboration.sharedTripId);
  if (!memberKey) throw new Error("当前设备没有这次协作旅行的编辑凭证");
  const payload = await readJson<CollaborationResponse>(
    await fetch(
      `/api/collaboration/trips/${encodeURIComponent(travel.collaboration.sharedTripId)}`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-travelmate-member-key": memberKey,
        },
        body: JSON.stringify({ travel, revision: travel.collaboration.revision, action }),
      },
    ),
  );
  return payload.travel;
}

export async function setCollaborationInviteRole(
  travel: TravelItem,
  inviteRole: Exclude<CollaborationRole, "owner">,
) {
  if (!travel.collaboration) throw new Error("这次旅行尚未开启协作");
  const memberKey = getCollaborationKey(travel.collaboration.sharedTripId);
  if (!memberKey) throw new Error("当前设备没有协作管理凭证");
  const payload = await readJson<CollaborationResponse>(
    await fetch(
      `/api/collaboration/trips/${encodeURIComponent(travel.collaboration.sharedTripId)}/invite-role`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-travelmate-member-key": memberKey,
        },
        body: JSON.stringify({ inviteRole }),
      },
    ),
  );
  return payload.travel;
}

export async function setCollaborationMemberRole(
  travel: TravelItem,
  memberId: string,
  role: Exclude<CollaborationRole, "owner">,
) {
  if (!travel.collaboration) throw new Error("这次旅行尚未开启协作");
  const memberKey = getCollaborationKey(travel.collaboration.sharedTripId);
  if (!memberKey) throw new Error("当前设备没有协作管理凭证");
  const payload = await readJson<CollaborationResponse>(
    await fetch(
      `/api/collaboration/trips/${encodeURIComponent(travel.collaboration.sharedTripId)}/members/${encodeURIComponent(memberId)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-travelmate-member-key": memberKey,
        },
        body: JSON.stringify({ role }),
      },
    ),
  );
  return payload.travel;
}

export function collaborationInviteUrl(inviteCode: string) {
  if (typeof window === "undefined") return `?invite=${encodeURIComponent(inviteCode)}`;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("invite", inviteCode);
  return url.toString();
}
