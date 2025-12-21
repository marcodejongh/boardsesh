CREATE INDEX "kilter_climbs_layout_filter_idx" ON "kilter_climbs" USING btree ("layout_id","is_listed","is_draft","frames_count");--> statement-breakpoint
CREATE INDEX "kilter_climbs_edges_idx" ON "kilter_climbs" USING btree ("edge_left","edge_right","edge_bottom","edge_top");--> statement-breakpoint
CREATE INDEX "tension_climbs_layout_filter_idx" ON "tension_climbs" USING btree ("layout_id","is_listed","is_draft","frames_count");--> statement-breakpoint
CREATE INDEX "tension_climbs_edges_idx" ON "tension_climbs" USING btree ("edge_left","edge_right","edge_bottom","edge_top");