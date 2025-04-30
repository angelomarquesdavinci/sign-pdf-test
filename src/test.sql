
  WITH top_waste_classifications AS (
	SELECT waste_classification_id,
		waste_unit
	FROM (
			SELECT waste_classification_id,
				waste_unit,
				SUM(waste_quantity) as total_waste_quantity,
				waste_class,
				waste_treatment,
				year(from_unixtime(document_updated_at)) as document_year,
				document_status,
				document_document_status,
				ROW_NUMBER() OVER (
					PARTITION BY waste_unit
					ORDER BY SUM(waste_quantity) DESC
				) as row_num
			FROM "tb_wastes"
			WHERE document_status = 1
				AND document_document_status = 4
				AND company_identifier IN (?)
			GROUP BY waste_unit,
				waste_classification_id,
				waste_class,
				waste_treatment,
				year(from_unixtime(document_updated_at)),
				document_status,
				document_document_status
		)
	WHERE row_num <= 5
	ORDER BY row_num DESC
	LIMIT 25
)
SELECT t.waste_classification_id,
	t.waste_unit,
	year(from_unixtime(t.document_updated_at)) as document_year,
	t.document_status,
	t.document_document_status,
	SUM(t.waste_quantity) as total_waste_quantity,
	t.waste_class
FROM "tb_wastes" t
	JOIN top_waste_classifications twc ON t.waste_classification_id = twc.waste_classification_id
	AND t.waste_unit = twc.waste_unit
WHERE t.document_status = 1
	AND t.document_document_status = 4
	AND t.company_identifier IN (?)
    and t.waste_treatment is not null and t.waste_treatment in (1, 2)
GROUP BY t.waste_classification_id,
	t.waste_unit,
	year(from_unixtime(t.document_updated_at)),
	t.document_status,
	t.document_document_status,
	t.waste_treatment;





    WITH numbered_waste_classification_ids as (
	SELECT waste_classification_id,
		ROW_NUMBER() OVER () AS row_num
	FROM "tb_wastes"
	WHERE waste_classification_id is not null
	GROUP BY waste_classification_id
),
numbered_company_address_cities AS (
	SELECT company_address_city,
		ROW_NUMBER() OVER () AS row_num
	FROM "tb_wastes"
	WHERE company_address_city is not null
	GROUP BY company_address_city
),
numbered_company_address_states AS (
	SELECT company_address_state,
		ROW_NUMBER() OVER () AS row_num
	FROM "tb_wastes"
	where company_address_state is not null
	GROUP BY company_address_state
)
numbered_company_cnaes_ids AS (
	SELECT company_cnae_id,
		ROW_NUMBER() OVER () AS row_num
	FROM "tb_wastes"
	WHERE company_cnae_id is not null
	GROUP BY company_cnae_id
),
numbered_company_identifiers AS (
	SELECT company_identifier,
		ROW_NUMBER() OVER () AS row_num
	FROM "tb_wastes"
	WHERE company_identifier is not null
	GROUP BY company_identifier
),
SELECT ncac.company_address_city AS company_address_city,
	ncas.company_address_state AS company_address_state,
	nwci.waste_classification_id AS waste_classification_id,
  ncci.company_cnae_id AS company_cnae_id, 
  nci.company_identifier AS company_identifier, 
FROM numbered_waste_classification_ids nwci
	FULL OUTER JOIN numbered_company_address_cities ncac ON ncac.row_num = nwci.row_num
	FULL OUTER JOIN numbered_company_address_states ncas ON ncas.row_num = nwci.row_num
  FULL OUTER JOIN numbered_company_cnaes_ids ncci ON ncci.row_num = nwci.row_num
  FULL OUTER JOIN numbered_company_identifiers nci ON nci.row_num = nwci.row_num



  SELECT
      t.waste_classification_id,
      t.waste_unit,
      year(from_unixtime(t.document_updated_at)) as document_year,
      t.document_status,
      t.document_document_status,
      SUM(t.waste_quantity) as total_waste_quantity , t.waste_class FROM
      "tb_wastes" t
  JOIN
      top_waste_classifications twc
  ON
      t.waste_classification_id = twc.waste_classification_id AND
      t.waste_unit = twc.waste_unit AND twc.document_year = year(from_unixtime(t.document_updated_at)) WHERE t.document_status = 1 AND t.document_document_status = 4 AND t.company_address_state IN (?) AND t.company_address_city IN (?, ?, ?) AND t.waste_classification_id IN (?) GROUP BY
    t.waste_classification_id,
    t.waste_unit,
    year(from_unixtime(t.document_updated_at)),
    t.document_status,
    t.document_document_status, t.waste_class;