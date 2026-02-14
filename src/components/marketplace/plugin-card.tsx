"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInstallCount, hasHostedOption, type PluginManifest } from "@/lib/marketplace-data";

interface PluginCardProps {
  plugin: PluginManifest;
}

export function PluginCard({ plugin }: PluginCardProps) {
  const hostedAvailable = hasHostedOption(plugin.capabilities);

  return (
    <Link href={`/marketplace/${plugin.id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Card className="h-full transition-colors hover:border-primary/40">
          <CardHeader>
            <div className="flex items-start gap-3">
              <motion.div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: plugin.color }}
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
              >
                {plugin.name[0]}
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{plugin.name}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    v{plugin.version}
                  </Badge>
                </div>
                <CardDescription className="mt-1 line-clamp-2">
                  {plugin.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {plugin.capabilities.map((cap) => (
                <Badge key={cap} variant="outline" className="text-[10px]">
                  {cap}
                </Badge>
              ))}
              {hostedAvailable && (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/25 text-[10px]">
                  WOPR Hosted Available
                </Badge>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatInstallCount(plugin.installCount)} installs</span>
              <span>{plugin.author}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
