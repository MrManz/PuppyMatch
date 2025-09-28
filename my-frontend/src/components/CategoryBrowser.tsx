{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import React from "react";\
import \{ Card, CardContent, CardDescription, CardHeader, CardTitle \} from "@/components/ui/card";\
import \{ keyOf, CATALOG \} from "@/lib/catalog";\
import ChipGrid from "./ChipGrid";\
\
export default function CategoryBrowser(\{\
  selected,\
  onToggle,\
\}: \{\
  selected: Record<string, boolean>;\
  onToggle: (label: string) => void;\
\}) \{\
  return (\
    <div className="space-y-4">\
      \{Object.entries(CATALOG).map(([cat, items]) => (\
        <Card key=\{cat\}>\
          <CardHeader className="pb-2">\
            <div>\
              <CardTitle className="text-base">\{cat\}</CardTitle>\
              <CardDescription>\{items.length\} interests</CardDescription>\
            </div>\
          </CardHeader>\
          <CardContent>\
            <ChipGrid\
              items=\{items.map((label) => (\{\
                key: keyOf(label),\
                label,\
                category: cat,\
              \}))\}\
              selected=\{selected\}\
              onToggle=\{onToggle\}\
            />\
          </CardContent>\
        </Card>\
      ))\}\
    </div>\
  );\
\}\
}