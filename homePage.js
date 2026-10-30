
document.addEventListener("DOMContentLoaded", () => {
  const cards = Array.from(document.querySelectorAll(".card"));
  const characters = Array.from(document.querySelectorAll(".charactercard"));

  if (characters.length === 0) {
    console.error("No .charactercard elements found. Check IDs/classes in HTML.");
    return;
  }
  if (cards.length === 0) {
    console.error("No .card elements found. Check IDs/classes in HTML.");
  }

  // Hide all characters
  function hideAll() {
    characters.forEach(c => { c.style.display = "none"; c.setAttribute("aria-hidden", "true"); });
  }

  // Show character by numeric index or id number (1-based)
  function showCharacterByNumber(num) {
    hideAll();
    // try exact id first: character<num>
    const byId = document.getElementById("character" + num);
    if (byId) {
      byId.style.display = "block";
      byId.setAttribute("aria-hidden", "false");
      cards.forEach((card, index) => card.setAttribute("aria-pressed", String(index + 1 === Number(num))));
      return true;
    }
    // fallback: try index (num-1)
    const idx = Number(num) - 1;
    if (!isNaN(idx) && idx >= 0 && idx < characters.length) {
      characters[idx].style.display = "block";
      return true;
    }
    console.warn("No matching character for number:", num);
    return false;
  }

  // set default: show character1 if exists, otherwise first char
  const defaultShown = showCharacterByNumber(1) || (function(){ hideAll(); characters[0].style.display = "block"; return true; })();

  // attach listeners
  cards.forEach((card, i) => {
    const name = characters[i]?.querySelector("h1")?.textContent || `Operator ${i + 1}`;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View ${name}`);
    card.setAttribute("aria-controls", characters[i]?.id || "charactersection");
    const label = document.createElement("span");
    label.className = "operator-label";
    label.textContent = `${String(i + 1).padStart(2, "0")} / ${name}`;
    card.append(label);
    card.addEventListener("click", (e) => {
      // try to extract trailing number from id like "card3"
      const m = card.id && card.id.match(/(\d+)\s*$/);
      const num = m ? m[1] : (i + 1); // fallback to index+1
      const ok = showCharacterByNumber(num);
      if (!ok) {
        // if failed, try by index
        showCharacterByNumber(i + 1);
      }
      // optional: bring clicked card into view center
      if (card.scrollIntoView) {
        card.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", inline: "center", block: "nearest" });
      }
    });
    // make sure card is keyboard accessible
    card.tabIndex = card.tabIndex || 0;
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        card.click();
      }
    });
  });

  // Helpful log
  console.log("Character switcher initialized —", characters.length, "character(s),", cards.length, "card(s).");
});

//-----------------------------


  window.addEventListener('load', () => {
    document.querySelector('.nav-container').classList.add('show');
  });

