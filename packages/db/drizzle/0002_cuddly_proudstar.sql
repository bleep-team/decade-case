ALTER TYPE "public"."order_status" ADD VALUE 'rejected';--> statement-breakpoint
CREATE TABLE "positions" (
	"broker_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"quantity" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_broker_id_symbol_pk" PRIMARY KEY("broker_id","symbol")
);
--> statement-breakpoint
ALTER TABLE "brokers" ADD COLUMN "api_key_hash" text;--> statement-breakpoint
ALTER TABLE "brokers" ADD COLUMN "is_mock" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stocks" ADD COLUMN "reference_price_cents" bigint;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_broker_id_brokers_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."brokers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_symbol_stocks_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."stocks"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_api_key_hash_unique" UNIQUE("api_key_hash");