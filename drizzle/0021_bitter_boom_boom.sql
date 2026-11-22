CREATE TABLE "ic_abruf" (
	"saison" integer NOT NULL,
	"wettbewerb" text NOT NULL,
	"versucht_am" timestamp with time zone NOT NULL,
	"wort" text NOT NULL,
	CONSTRAINT "ic_abruf_saison_wettbewerb_pk" PRIMARY KEY("saison","wettbewerb"),
	CONSTRAINT "ic_abruf_wettbewerb_check" CHECK ("ic_abruf"."wettbewerb" in ('ic', 'jic')),
	CONSTRAINT "ic_abruf_wort_check" CHECK ("ic_abruf"."wort" in ('ok', 'keine-teams', 'form', 'stoerung'))
);
