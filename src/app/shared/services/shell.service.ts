import { Injectable, signal } from "@angular/core";
@Injectable({ providedIn: "root" })
export class ShellService {
  readonly menuOpen = signal(false);
  readonly information = signal<"help" | "about" | null>(null);
}
