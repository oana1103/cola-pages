// Keep a short completion acknowledgement through an idle notification, but let
// new work interrupt it. Repeated notifications must not replay the celebration.
export class TaskPose {
  value = 0;
  requested = 0;
  completeUntil = 0;

  receive(next, now) {
    if (next === 5) {
      if (this.requested !== 5) {
        this.value = 5;
        this.completeUntil = now + 1400;
      }
    } else if (next !== 0 || now >= this.completeUntil) {
      this.value = next;
      this.completeUntil = 0;
    }
    this.requested = next;
    return this.advance(now);
  }

  advance(now) {
    if (this.value === 5 && now >= this.completeUntil) {
      this.value = 0;
      this.completeUntil = 0;
    }
    return this.value;
  }

  reset() {
    this.value = this.requested = this.completeUntil = 0;
  }
}
