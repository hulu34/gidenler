"""Overture Maps Places: İstanbul kutusundaki yerleri yerel Parquet dosyasına çeker (paket 16+). Kullanım: python overture-cek.py <cikti.parquet>  (duckdb gerekir; anonim S3 okuması, ücretsiz)."""
import duckdb, sys
out = sys.argv[1]
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
q = f"""
COPY (
 SELECT id, names.primary AS ad, basic_category AS kategori, taxonomy.primary AS takson, taxonomy.hierarchy AS hiyerarsi, confidence,
        websites, phones, addresses, sources, brand.names.primary AS marka, operating_status,
        bbox.xmin AS lng, bbox.ymin AS lat
 FROM read_parquet('s3://overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/*', hive_partitioning=1)
 WHERE bbox.xmin BETWEEN 27.9 AND 29.95 AND bbox.ymin BETWEEN 40.8 AND 41.6
) TO '{out}' (FORMAT PARQUET)
"""
con.execute(q)
print(con.execute(f"SELECT count(*) FROM '{out}'").fetchone())
