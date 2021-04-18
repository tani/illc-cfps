/// <reference path="./deployctl.d.ts" />
import * as ics from "https://esm.sh/ics@2.27.0";
import { DateTime } from "https://esm.sh/luxon@1.26.0";
import _ from "https://esm.sh/lodash-es@4.17.21";
import { cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";

async function GenerateCalendar() {
  const res = await fetch(
    "https://www.illc.uva.nl/NewsandEvents/Events/Conferences/",
  );
  const $ = cheerio.load(await res.text());
  const events = $(
    "#pagecontents > div > section > section:nth-child(9) .vevent",
  ).map((_, li) => {
    const title = $("h4", li).text();
    const uid = "taniguchi.masaya" + $(".uid", li).attr("href");
    const _start = DateTime.fromFormat(
      $(".dtstart", li).attr("title") || "",
      "yyyy-MM-dd",
    );
    const _end = DateTime.fromFormat(
      $(".dtend", li).attr("title") || "",
      "yyyy-MM-dd",
    );
    const location = $(".location", li).text().replace(/Location:\s*/, "");
    const deadlineSrc = $("div", li)
      .filter((_, div) => $(div).text().search(/Deadline:/) >= 0)
      .first()
      .text()
      .replace(/Deadline:\s*[a-zA-Z]+\s*/, "");
    const _deadline = DateTime.fromFormat(deadlineSrc, "d MMMM yyyy").setZone(
      "Asia/Tokyo",
    );
    const start = _deadline.toFormat("yyyy-M-d-H-m").split("-");
    const description = $(".description", li).text();
    return {
      _start: _start.isValid ? _start.toFormat("d MMMM yyyyy") : "",
      _end: _end.isValid ? _end.toFormat("d MMMM yyyy") : "",
      _deadline: _deadline.isValid ? _deadline.toFormat("d MMMM yyyy") : "",
      start,
      duration: { hours: 24 },
      uid,
      title,
      description,
      location,
    };
  }).toArray();
  const template = await (await fetch(new URL("index.ejs", import.meta.url)))
    .text();
    
  const html = _.template(template)({ events })
  events.forEach((event: any) => {
    delete event._start;
    delete event._end;
    delete event._deadline;
  });
  return { html, ...ics.createEvents(events as any) };
}

self.addEventListener("fetch", async (event) => {
  const result = await GenerateCalendar();
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/deadlines.ics")) {
    const body = result.value;
    event.respondWith(
      new Response(
        body,
        {
          headers: {
            "Content-Type": "text/calendar",
          },
        },
      ),
    );
  } else {
    const body = result.html;
    event.respondWith(
      new Response(
        body,
        {
          headers: {
            "Content-Type": "text/html",
          },
        },
      ),
    );
  }
});
