import { useState, useEffect, useRef, useCallback } from "react";
import {
  checkUsernameAvailable,
  checkEmailAvailable,
  checkPhoneAvailable,
  type AvailabilityStatus,
} from "@/services/authService";
import { isE164 } from "@/lib/validation";

type FieldKey = "username" | "email" | "phone";

interface UseAvailabilityCheckReturn {
  status: Record<FieldKey, AvailabilityStatus>;
  isBlocking: boolean;
}

const DEBOUNCE_MS = 400;

const USERNAME_MIN_LENGTH = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useAvailabilityCheck(
  username: string,
  email: string,
  phone: string,
): UseAvailabilityCheckReturn {
  const [status, setStatus] = useState<Record<FieldKey, AvailabilityStatus>>({
    username: "idle",
    email: "idle",
    phone: "idle",
  });

  const timers = useRef<Record<FieldKey, ReturnType<typeof setTimeout> | null>>({
    username: null,
    email: null,
    phone: null,
  });
  const latestVal = useRef<Record<FieldKey, string>>({
    username: "",
    email: "",
    phone: "",
  });
  const abortRef = useRef<Record<FieldKey, AbortController | null>>({
    username: null,
    email: null,
    phone: null,
  });

  const check = useCallback(
    async (field: FieldKey, value: string) => {
      const controller = new AbortController();
      abortRef.current[field] = controller;

      let result: boolean | "unknown";
      switch (field) {
        case "username":
          result = await checkUsernameAvailable(value);
          break;
        case "email":
          result = await checkEmailAvailable(value);
          break;
        case "phone":
          result = await checkPhoneAvailable(value);
          break;
      }

      if (controller.signal.aborted) return;
      if (latestVal.current[field] === value) {
        let newStatus: AvailabilityStatus;
        if (result === "unknown") {
          newStatus = "unknown";
        } else {
          newStatus = result ? "available" : "taken";
        }
        setStatus((prev) => ({
          ...prev,
          [field]: newStatus,
        }));
      }
    },
    [],
  );

  useEffect(() => {
    latestVal.current.username = username;

    if (!username || username.length < USERNAME_MIN_LENGTH) {
      setStatus((prev) => ({ ...prev, username: "idle" }));
      return;
    }

    setStatus((prev) => ({ ...prev, username: "checking" }));
    if (timers.current.username) clearTimeout(timers.current.username);
    timers.current.username = setTimeout(() => {
      check("username", username);
    }, DEBOUNCE_MS);

    return () => {
      if (timers.current.username) clearTimeout(timers.current.username);
      if (abortRef.current.username) abortRef.current.username.abort();
    };
  }, [username, check]);

  useEffect(() => {
    latestVal.current.email = email;

    if (!email || !EMAIL_REGEX.test(email)) {
      setStatus((prev) => ({ ...prev, email: "idle" }));
      return;
    }

    setStatus((prev) => ({ ...prev, email: "checking" }));
    if (timers.current.email) clearTimeout(timers.current.email);
    timers.current.email = setTimeout(() => {
      check("email", email);
    }, DEBOUNCE_MS);

    return () => {
      if (timers.current.email) clearTimeout(timers.current.email);
      if (abortRef.current.email) abortRef.current.email.abort();
    };
  }, [email, check]);

  useEffect(() => {
    latestVal.current.phone = phone;

    if (!phone || !isE164(phone)) {
      setStatus((prev) => ({ ...prev, phone: "idle" }));
      return;
    }

    setStatus((prev) => ({ ...prev, phone: "checking" }));
    if (timers.current.phone) clearTimeout(timers.current.phone);
    timers.current.phone = setTimeout(() => {
      check("phone", phone);
    }, DEBOUNCE_MS);

    return () => {
      if (timers.current.phone) clearTimeout(timers.current.phone);
      if (abortRef.current.phone) abortRef.current.phone.abort();
    };
  }, [phone, check]);

  const isBlocking =
    status.username === "checking" ||
    status.username === "taken" ||
    status.email === "checking" ||
    status.email === "taken" ||
    status.phone === "checking" ||
    status.phone === "taken";

  return { status, isBlocking };
}