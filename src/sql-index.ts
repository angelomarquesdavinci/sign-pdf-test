import { SQLService, SqlFunction } from "./sql-query";

export enum DocumentWasteUnit {
  KG = 0,
  TON = 1,
  UN = 2,
  L = 3,
  M3 = 4,
}

export enum DocumentWasteClass {
  CLASS1 = 0,
  CLASS2A = 1,
  CLASS2B = 2,
}

export enum DocumentWasteTreatment {
  LANDFILL = 0,
  AUTOCLAVE = 1,
  BLENDING_FOR_COPROCESSING = 2,
  COMPOSTING = 3,
  COPROCESSING = 4,
  LAMP_DECONTAMINATION = 5,
  EDUCATIONAL_PURPOSES = 6,
  GASIFICATION = 7,
  INCINERATION = 8,
  MICROWAVE = 9,
  RECYCLING = 10,
  ENERGY_RECOVERY = 11,
  RE_REFINING = 12,
  EFFLUENT_TREATMENT = 13,
  THERMAL_TREATMENT = 14,
  AGRICULTURAL_USE = 15,
  STOCK = 16,
}

export interface IExampleTable {
  company_address_city?: string;
  company_address_state?: string;
  company_identifier?: string;
  document_updated_at?: number;
  company_cnae_id?: string;
  waste_classification_id?: string;
  waste_unit?: DocumentWasteUnit;
  waste_frequency?: string;
  waste_quantity?: string;
  waste_class?: DocumentWasteClass;
  waste_treatment?: DocumentWasteTreatment;
  document_year?: number;
  total_waste_quantity?: number;
  document_status?: number;
  document_document_status?: number;
}

async function work() {
  const sql = new SQLService();

  console.log(
    sql
      .query<IExampleTable>('"tb_wastes"')
      .select({
        company_address_city: true,
        waste_quantity: {
          functionValue: SqlFunction.SUM,
        },
        document_updated_at: {
          functionValue: SqlFunction.YEAR,
          alias: "document_year",
        },
        waste_classification_id: true,
        waste_unit: {
          functionValue: SqlFunction.ROW_NUMBER,
          partitionOrderBy: {
            column: "waste_quantity",
            functionValue: SqlFunction.SUM,
            order: "desc",
          },
        },
      })
      .where({
        and: {
          document_status: {
            equals: 1,
          },
          document_document_status: {
            equals: 4,
          },
          document_updated_at: {
            between: [1, 100000000],
          },
          company_identifier: {
            in: ["124213432", "1324213412", "132412342"],
          },
        },
      })
      .groupBy()
      .orderBy({
        waste_unit: true,
      })
      .limit(10)
      .getStatement().query
  );
}

work();
