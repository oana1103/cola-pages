export class PokeReaction {
  clicks = [];
  until = 0;
  current = null;

  click(now) {
    if (this.current === 8 && now < this.until) return;
    this.clicks = this.clicks.filter(time => now - time <= 1200);
    this.clicks.push(now);
    this.current = this.clicks.length >= 3 ? 8 : 6;
    this.until = now + (this.current === 8 ? 1500 : 700);
    if (this.current === 8) this.clicks = [];
  }

  pose(now) { return now < this.until ? this.current : null; }

  reset() {
    this.clicks = [];
    this.until = 0;
    this.current = null;
  }
}
