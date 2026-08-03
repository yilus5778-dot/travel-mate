import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getCollabDb, type CollabDb } from "./server/db";
import {
  aiExtractIntent,
  aiOrganizeItinerary,
  aiPlanItinerary,
  aiRecognizeImages,
  fetchLinkText,
} from "./server/ai";
import { fetchWeatherForecast } from "./server/weather";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type SharedTripRow = {
  id: string;
  invite_code: string;
  invite_role: "editor" | "viewer";
  travel_json: string;
  revision: number;
  updated_at: string;
};

type MemberRow = {
  id: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  joined_at: string;
};

type EventRow = {
  id: string;
  actor_name: string;
  action: string;
  created_at: string;
};

let schemaPromise: Promise<void> | undefined;

function json(payload: unknown, init?: ResponseInit) {
  return Response.json(payload, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function randomToken(bytes = 16) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function hashToken(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

async function ensureCollaborationSchema(db: CollabDb) {
  if (!schemaPromise) {
    schemaPromise = db
      .batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS shared_trips (
          id TEXT PRIMARY KEY,
          invite_code TEXT NOT NULL UNIQUE,
          invite_role TEXT NOT NULL DEFAULT 'editor',
          travel_json TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS collaboration_members (
          id TEXT PRIMARY KEY,
          trip_id TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          member_key_hash TEXT NOT NULL UNIQUE,
          joined_at TEXT NOT NULL,
          FOREIGN KEY (trip_id) REFERENCES shared_trips(id) ON DELETE CASCADE
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS collaboration_events (
          id TEXT PRIMARY KEY,
          trip_id TEXT NOT NULL,
          actor_name TEXT NOT NULL,
          action TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (trip_id) REFERENCES shared_trips(id) ON DELETE CASCADE
        )`),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS collaboration_members_trip_idx ON collaboration_members(trip_id)",
        ),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS collaboration_events_trip_idx ON collaboration_events(trip_id, created_at DESC)",
        ),
      ])
      .then(() => undefined)
      .catch((error) => {
        schemaPromise = undefined;
        throw error;
      });
  }
  await schemaPromise;
}

async function getDb(env: unknown): Promise<CollabDb> {
  try {
    return await getCollabDb(env);
  } catch {
    throw new Error("协作数据库尚未连接，请稍后重试");
  }
}

function cleanTravel(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("旅行数据格式不正确");
  }
  const travel = { ...(value as Record<string, unknown>) };
  delete travel.collaboration;
  return travel;
}

async function getMember(db: CollabDb, tripId: string, request: Request) {
  const memberKey = request.headers.get("x-travelmate-member-key")?.trim();
  if (!memberKey) return null;
  const keyHash = await hashToken(memberKey);
  return db
    .prepare(
      "SELECT id, name, role, joined_at FROM collaboration_members WHERE trip_id = ? AND member_key_hash = ? LIMIT 1",
    )
    .bind(tripId, keyHash)
    .first<MemberRow>();
}

async function appendEvent(db: CollabDb, tripId: string, actorName: string, action: string) {
  await db
    .prepare(
      "INSERT INTO collaboration_events (id, trip_id, actor_name, action, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(
      `event_${randomToken(10)}`,
      tripId,
      actorName,
      action.slice(0, 80),
      new Date().toISOString(),
    )
    .run();
}

async function buildSharedTravel(db: CollabDb, trip: SharedTripRow, member: MemberRow) {
  const members = await db
    .prepare(
      "SELECT id, name, role, joined_at FROM collaboration_members WHERE trip_id = ? ORDER BY joined_at ASC",
    )
    .bind(trip.id)
    .all<MemberRow>();
  const events = await db
    .prepare(
      "SELECT id, actor_name, action, created_at FROM collaboration_events WHERE trip_id = ? ORDER BY created_at DESC LIMIT 20",
    )
    .bind(trip.id)
    .all<EventRow>();
  const travel = cleanTravel(JSON.parse(trip.travel_json));
  return {
    ...travel,
    collaboration: {
      sharedTripId: trip.id,
      inviteCode: trip.invite_code,
      role: member.role,
      inviteRole: trip.invite_role,
      revision: trip.revision,
      members: members.results.map((item) => ({
        id: item.id,
        name: item.name,
        role: item.role,
        joinedAt: item.joined_at,
      })),
      events: events.results.map((item) => ({
        id: item.id,
        actor: item.actor_name,
        action: item.action,
        createdAt: item.created_at,
      })),
      syncedAt: trip.updated_at,
    },
  };
}

async function getSharedTrip(db: CollabDb, tripId: string) {
  return db
    .prepare(
      "SELECT id, invite_code, invite_role, travel_json, revision, updated_at FROM shared_trips WHERE id = ? LIMIT 1",
    )
    .bind(tripId)
    .first<SharedTripRow>();
}

async function handleCollaborationApi(request: Request, env: unknown) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/collaboration/")) return null;

  try {
    const db = await getDb(env);
    await ensureCollaborationSchema(db);

    if (url.pathname === "/api/collaboration/create" && request.method === "POST") {
      const body = (await request.json()) as {
        travel?: unknown;
        ownerName?: string;
        inviteRole?: "editor" | "viewer";
      };
      const travel = cleanTravel(body.travel);
      const ownerName = body.ownerName?.trim().slice(0, 20) || "我";
      const inviteRole = body.inviteRole === "viewer" ? "viewer" : "editor";
      const sharedTripId = `shared_${randomToken(12)}`;
      const inviteCode = randomToken(5).toUpperCase();
      const memberKey = randomToken(24);
      const ownerId = `member_${randomToken(10)}`;
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT INTO shared_trips (id, invite_code, invite_role, travel_json, revision, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
          )
          .bind(sharedTripId, inviteCode, inviteRole, JSON.stringify(travel), now, now),
        db
          .prepare(
            "INSERT INTO collaboration_members (id, trip_id, name, role, member_key_hash, joined_at) VALUES (?, ?, ?, 'owner', ?, ?)",
          )
          .bind(ownerId, sharedTripId, ownerName, await hashToken(memberKey), now),
        db
          .prepare(
            "INSERT INTO collaboration_events (id, trip_id, actor_name, action, created_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(`event_${randomToken(10)}`, sharedTripId, ownerName, "创建了协作旅行", now),
      ]);
      const trip = await getSharedTrip(db, sharedTripId);
      const member = await db
        .prepare("SELECT id, name, role, joined_at FROM collaboration_members WHERE id = ? LIMIT 1")
        .bind(ownerId)
        .first<MemberRow>();
      if (!trip || !member) throw new Error("协作空间创建失败");
      return json(
        { travel: await buildSharedTravel(db, trip, member), memberKey },
        { status: 201 },
      );
    }

    if (url.pathname === "/api/collaboration/join" && request.method === "POST") {
      const body = (await request.json()) as { inviteCode?: string; displayName?: string };
      const inviteCode = body.inviteCode?.trim().toUpperCase();
      const displayName = body.displayName?.trim().slice(0, 20);
      if (!inviteCode || !displayName) {
        return json({ error: "请填写昵称和有效的邀请码" }, { status: 400 });
      }
      const trip = await db
        .prepare(
          "SELECT id, invite_code, invite_role, travel_json, revision, updated_at FROM shared_trips WHERE invite_code = ? LIMIT 1",
        )
        .bind(inviteCode)
        .first<SharedTripRow>();
      if (!trip) return json({ error: "邀请已失效或邀请码不存在" }, { status: 404 });
      const memberKey = randomToken(24);
      const memberId = `member_${randomToken(10)}`;
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT INTO collaboration_members (id, trip_id, name, role, member_key_hash, joined_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(memberId, trip.id, displayName, trip.invite_role, await hashToken(memberKey), now),
        db
          .prepare(
            "INSERT INTO collaboration_events (id, trip_id, actor_name, action, created_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(
            `event_${randomToken(10)}`,
            trip.id,
            displayName,
            trip.invite_role === "editor" ? "以可编辑成员身份加入" : "以只读成员身份加入",
            now,
          ),
      ]);
      const member = await db
        .prepare("SELECT id, name, role, joined_at FROM collaboration_members WHERE id = ? LIMIT 1")
        .bind(memberId)
        .first<MemberRow>();
      if (!member) throw new Error("加入协作旅行失败");
      return json(
        { travel: await buildSharedTravel(db, trip, member), memberKey },
        { status: 201 },
      );
    }

    const tripMatch = url.pathname.match(/^\/api\/collaboration\/trips\/([^/]+)$/);
    if (tripMatch) {
      const tripId = decodeURIComponent(tripMatch[1]);
      const trip = await getSharedTrip(db, tripId);
      if (!trip) return json({ error: "协作旅行不存在" }, { status: 404 });
      const member = await getMember(db, tripId, request);
      if (!member) return json({ error: "无权访问这次协作旅行" }, { status: 401 });

      if (request.method === "GET") {
        return json({ travel: await buildSharedTravel(db, trip, member) });
      }
      if (request.method === "PUT") {
        if (member.role === "viewer") {
          return json({ error: "只读成员不能修改行程" }, { status: 403 });
        }
        const body = (await request.json()) as {
          travel?: unknown;
          revision?: number;
          action?: string;
        };
        if (body.revision !== trip.revision) {
          return json({ error: "行程已有新版本，请刷新后再修改" }, { status: 409 });
        }
        const travel = cleanTravel(body.travel);
        const now = new Date().toISOString();
        const result = await db
          .prepare(
            "UPDATE shared_trips SET travel_json = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?",
          )
          .bind(JSON.stringify(travel), now, tripId, trip.revision)
          .run();
        if (!result.meta?.changes) {
          return json({ error: "行程刚刚被其他成员更新，请刷新后重试" }, { status: 409 });
        }
        await appendEvent(db, tripId, member.name, body.action?.trim() || "更新了旅行内容");
        const updatedTrip = await getSharedTrip(db, tripId);
        if (!updatedTrip) throw new Error("同步后无法读取行程");
        return json({ travel: await buildSharedTravel(db, updatedTrip, member) });
      }
    }

    const inviteRoleMatch = url.pathname.match(
      /^\/api\/collaboration\/trips\/([^/]+)\/invite-role$/,
    );
    if (inviteRoleMatch && request.method === "POST") {
      const tripId = decodeURIComponent(inviteRoleMatch[1]);
      const member = await getMember(db, tripId, request);
      if (!member || member.role !== "owner") {
        return json({ error: "只有创建者可以修改邀请权限" }, { status: 403 });
      }
      const body = (await request.json()) as { inviteRole?: "editor" | "viewer" };
      const inviteRole = body.inviteRole === "viewer" ? "viewer" : "editor";
      const now = new Date().toISOString();
      await db
        .prepare("UPDATE shared_trips SET invite_role = ?, updated_at = ? WHERE id = ?")
        .bind(inviteRole, now, tripId)
        .run();
      await appendEvent(
        db,
        tripId,
        member.name,
        inviteRole === "editor" ? "将新成员权限设为可编辑" : "将新成员权限设为只读",
      );
      const trip = await getSharedTrip(db, tripId);
      if (!trip) throw new Error("协作旅行不存在");
      return json({ travel: await buildSharedTravel(db, trip, member) });
    }

    const memberRoleMatch = url.pathname.match(
      /^\/api\/collaboration\/trips\/([^/]+)\/members\/([^/]+)$/,
    );
    if (memberRoleMatch && request.method === "PATCH") {
      const tripId = decodeURIComponent(memberRoleMatch[1]);
      const targetMemberId = decodeURIComponent(memberRoleMatch[2]);
      const member = await getMember(db, tripId, request);
      if (!member || member.role !== "owner") {
        return json({ error: "只有创建者可以修改成员权限" }, { status: 403 });
      }
      const body = (await request.json()) as { role?: "editor" | "viewer" };
      const role = body.role === "viewer" ? "viewer" : "editor";
      const target = await db
        .prepare(
          "SELECT id, name, role, joined_at FROM collaboration_members WHERE id = ? AND trip_id = ? LIMIT 1",
        )
        .bind(targetMemberId, tripId)
        .first<MemberRow>();
      if (!target || target.role === "owner") {
        return json({ error: "不能修改创建者权限" }, { status: 400 });
      }
      await db
        .prepare("UPDATE collaboration_members SET role = ? WHERE id = ? AND trip_id = ?")
        .bind(role, targetMemberId, tripId)
        .run();
      await appendEvent(
        db,
        tripId,
        member.name,
        `将${target.name}设为${role === "editor" ? "可编辑" : "只读"}成员`,
      );
      const trip = await getSharedTrip(db, tripId);
      if (!trip) throw new Error("协作旅行不存在");
      return json({ travel: await buildSharedTravel(db, trip, member) });
    }

    return json({ error: "协作接口不存在" }, { status: 404 });
  } catch (error) {
    console.error(error);
    return json(
      { error: error instanceof Error ? error.message : "协作服务暂时不可用" },
      { status: 500 },
    );
  }
}

async function handleAiApi(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/ai/")) return null;
  if (request.method !== "POST") return json({ error: "只支持 POST 请求" }, { status: 405 });

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (url.pathname === "/api/ai/intent") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) return json({ error: "缺少要分析的文字" }, { status: 400 });
      if (text.length > 8000) return json({ error: "文字内容过长" }, { status: 400 });
      return json({ intent: await aiExtractIntent(text) });
    }

    if (url.pathname === "/api/ai/organize") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) return json({ error: "缺少要整理的攻略内容" }, { status: 400 });
      if (text.length > 12000) return json({ error: "攻略内容过长" }, { status: 400 });
      return json(await aiOrganizeItinerary(text));
    }

    if (url.pathname === "/api/ai/plan") {
      const destination = typeof body.destination === "string" ? body.destination.trim() : "";
      const durationDays = Number(body.durationDays);
      if (!destination || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 14) {
        return json({ error: "需要明确的目的地和 1-14 天的行程天数" }, { status: 400 });
      }
      return json(
        await aiPlanItinerary({
          destination,
          durationDays,
          peopleCount: typeof body.peopleCount === "number" ? body.peopleCount : null,
          budget: typeof body.budget === "number" ? body.budget : null,
          departureCity: typeof body.departureCity === "string" ? body.departureCity : null,
          dateText: typeof body.dateText === "string" ? body.dateText : null,
          destinationPreference:
            typeof body.destinationPreference === "string" ? body.destinationPreference : null,
        }),
      );
    }

    if (url.pathname === "/api/ai/recognize") {
      const images = Array.isArray(body.images) ? body.images : [];
      const valid = images.filter(
        (item): item is string =>
          typeof item === "string" &&
          item.startsWith("data:image/") &&
          item.length < 6_000_000,
      );
      if (!valid.length) {
        return json({ error: "没有可识别的图片(仅支持 data:image/ 格式,单张 4MB 内)" }, { status: 400 });
      }
      return json({ texts: await aiRecognizeImages(valid.slice(0, 4)) });
    }

    if (url.pathname === "/api/ai/fetch-link") {
      const link = typeof body.url === "string" ? body.url.trim() : "";
      if (!link) return json({ error: "缺少链接" }, { status: 400 });
      return json({ text: await fetchLinkText(link) });
    }

    return json({ error: "AI 接口不存在" }, { status: 404 });
  } catch (error) {
    console.error(error);
    return json(
      { error: error instanceof Error ? error.message : "AI 服务暂时不可用" },
      { status: 500 },
    );
  }
}

async function handleWeatherApi(request: Request) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/weather") return null;

  try {
    const city = url.searchParams.get("city")?.trim();
    if (!city) return json({ error: "缺少 city 参数" }, { status: 400 });
    return json(await fetchWeatherForecast(city));
  } catch (error) {
    console.error(error);
    return json(
      { error: error instanceof Error ? error.message : "天气服务暂时不可用" },
      { status: 500 },
    );
  }
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function absolutizeSocialImageUrls(response: Response, request: Request): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const absoluteImageUrl = new URL("/og.png", request.url).href;
  const html = (await response.text()).replaceAll(
    'content="/og.png"',
    `content="${absoluteImageUrl}"`,
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const collaborationResponse = await handleCollaborationApi(request, env);
      if (collaborationResponse) return collaborationResponse;
      const aiResponse = await handleAiApi(request);
      if (aiResponse) return aiResponse;
      const weatherResponse = await handleWeatherApi(request);
      if (weatherResponse) return weatherResponse;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalizedResponse = await normalizeCatastrophicSsrResponse(response);
      return await absolutizeSocialImageUrls(normalizedResponse, request);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
