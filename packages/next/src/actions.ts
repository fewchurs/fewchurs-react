"use server";

import { revalidatePath } from "next/cache";
import { userMessage } from "@fewchurs/react/core";
import { serverClient } from "./config";
import { resolveDeviceId } from "./identity";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Server actions for boards built with plain forms — the client board talks to the route
 * handler instead. Pass `path` when the page should re-render with the new data.
 */
export async function submitFeatureAction(formData: FormData): Promise<ActionResult> {
  const client = await serverClient(await resolveDeviceId());
  const result = await client.submitFeature({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    email: optional(formData.get("email")),
  });

  revalidate(formData);
  return result.ok ? { ok: true } : { ok: false, message: userMessage(result.error) };
}

export async function voteAction(formData: FormData): Promise<ActionResult> {
  const featureId = String(formData.get("featureId") ?? "");
  const hasVoted = formData.get("hasVoted") === "true";
  const client = await serverClient(await resolveDeviceId());
  const result = hasVoted ? await client.unvote(featureId) : await client.vote(featureId);

  revalidate(formData);
  return result.ok ? { ok: true } : { ok: false, message: userMessage(result.error) };
}

export async function commentAction(formData: FormData): Promise<ActionResult> {
  const client = await serverClient(await resolveDeviceId());
  const result = await client.createComment({
    featureId: String(formData.get("featureId") ?? ""),
    text: String(formData.get("text") ?? ""),
    authorName: optional(formData.get("authorName")),
  });

  revalidate(formData);
  return result.ok ? { ok: true } : { ok: false, message: userMessage(result.error) };
}

export async function followAction(formData: FormData): Promise<ActionResult> {
  const featureId = String(formData.get("featureId") ?? "");
  const email = optional(formData.get("email"));
  const client = await serverClient(await resolveDeviceId());
  const result = email ? await client.follow(featureId, email) : await client.unfollow(featureId);

  revalidate(formData);
  return result.ok ? { ok: true } : { ok: false, message: userMessage(result.error) };
}

function optional(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

function revalidate(formData: FormData): void {
  const path = formData.get("path");
  if (typeof path === "string" && path.startsWith("/")) revalidatePath(path);
}
