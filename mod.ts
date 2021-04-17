/// <reference path="./deployctl.d.ts" />

import * as ics from "https://esm.sh/ics@2.27.0"
import { DateTime } from "https://esm.sh/luxon@1.26.0";
import { cheerio } from "https://deno.land/x/cheerio@1.0.2/mod.ts"

const res = await fetch("https://www.illc.uva.nl/NewsandEvents/Events/Conferences/")
const $ = cheerio.load(await res.text())
const events = $("#pagecontents > div > section > section:nth-child(9) .vevent").map((_, li) => {
    const title = $("h4", li).text()
    const uid = "taniguchi.masaya" + $(".uid", li).attr("href")
    const _start = DateTime.fromFormat($(".dtstart", li).attr("title") || "", "yyyy-MM-dd")
    const _end = DateTime.fromFormat($(".dtend", li).attr("title") || "", "yyyy-MM-dd")
    const location = $(".location", li).text().replace(/Location:\s*/, '')
    const deadlineSrc = 
        $("div", li)
            .filter((_, div)=>$(div).text().search(/Deadline:/) >= 0)
            .first()
            .text()
            .replace(/Deadline:\s*[a-zA-Z]+\s*/, '')
    const _deadline = DateTime.fromFormat(deadlineSrc, "d MMMM yyyy").setZone('Asia/Tokyo')
    const start = _deadline.toFormat("yyyy-M-d-H-m").split("-")
    const description = $(".description", li).text()
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
    }
}).toArray()

events.forEach((event: any) => {
    delete event._start
    delete event._end
    delete event._deadline
})

const deadlines = ics.createEvents(events as any)
console.log(deadlines)