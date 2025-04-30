import SQL, { SQLStatement } from "sql-template-strings";

export enum SqlFunction {
  ROW_NUMBER,
  YEAR,
  SUM,
}

type IOrderBy = "asc" | "desc";

interface ISqlFunctionBaseObject {
  functionValue: SqlFunction.SUM | SqlFunction.YEAR;
  alias?: string;
  hideAlias?: boolean;
}

type ISqlFunctionObject<T> =
  | ISqlFunctionBaseObject
  | {
      functionValue: SqlFunction.ROW_NUMBER;
      alias?: string;
      partitionOrderBy?: {
        column: keyof T;
        functionValue?: SqlFunction;
        order?: IOrderBy;
      };
    };

type ISelectQueryParams<T> = Partial<
  Record<keyof T, boolean | ISqlFunctionObject<T>>
>;

interface IWhereParam<T> {
  and: {
    [key in keyof T]: {
      equals?: string | number;
      in?: (string | number)[];
      between?: [number, number];
    };
  };
}

class SQLQuery {
  protected statement: SQLStatement;
  protected tableName: string;
  protected tableAlias?: string;
  //   protected selectColumns: ISelectQueryParams = {};

  constructor(query: SQLStatement, tableName: string, tableAlias?: string) {
    this.statement = query;
    this.tableName = tableName;
    this.tableAlias = tableAlias;
    // this.selectColumns = {};
  }

  private getSelectFunction<T>(
    column: string,
    functionObject: ISqlFunctionObject<T>
  ) {
    let query = "";
    const { functionValue, alias } = functionObject;

    switch (functionValue) {
      case SqlFunction.SUM:
        query = `SUM(${column}) `;

        if (functionObject.hideAlias) return query;

        if (alias) return query + `AS ${alias}`;

        if (!column.includes(".")) return query + `AS total_${column}`;

        return query + `AS total_${column.split(".").at(1)}`;
      case SqlFunction.YEAR:
        query = `year(from_unixtime(${column})) `;

        if (functionObject.hideAlias) return query;

        if (alias) return query + `AS ${alias}`;

        if (!column.includes(".")) return query + `AS ${column}_year`;

        return query + `AS ${column.split(".").at(1)}_year`;
      case SqlFunction.ROW_NUMBER:
        const { partitionOrderBy } = functionObject;

        let orderByColumn = "";

        if (partitionOrderBy?.functionValue) {
          const aliasColumn = this.tableAlias
            ? `${this.tableAlias}.${String(partitionOrderBy.column)}`
            : String(partitionOrderBy.column);

          orderByColumn = this.getSelectFunction(aliasColumn, {
            functionValue: partitionOrderBy.functionValue,
            hideAlias: true,
          });
        } else {
          orderByColumn = String(partitionOrderBy?.column);
        }

        query = `${column}, ROW_NUMBER() OVER (PARTITION BY ${column} ORDER BY ${orderByColumn}`;

        let aliasQuery = " AS ";
        if (alias) {
          aliasQuery += alias;
        } else {
          aliasQuery += "row_num";
        }

        if (!partitionOrderBy?.order) return query + ") " + aliasQuery;

        return query + `${partitionOrderBy.order.toUpperCase()}) ${aliasQuery}`;
      default:
        return column;
    }
  }

  protected getSelectValues<T>(columns: ISelectQueryParams<T>) {
    const values: string[] = [];

    Object.keys(columns).forEach((item) => {
      const key = item as keyof T;
      const aliasKey = this.tableAlias ? `${this.tableAlias}.${item}` : item;

      if (typeof columns[key] === "boolean") {
        values.push(aliasKey);
        return;
      }

      const functionObject = columns[key] as ISqlFunctionObject<T>;

      values.push(this.getSelectFunction(aliasKey, functionObject));
    });

    return values;
  }

  getStatement() {
    return this.statement;
  }
}

class SQLSelectQuery<T> extends SQLQuery {
  constructor(query: SQLStatement, tableName: string, tableAlias?: string) {
    super(query, tableName, tableAlias);
  }

  select(columns: ISelectQueryParams<T>) {
    const values = this.getSelectValues(columns);

    this.statement.append(`SELECT ${values.join(", ")} `);
    this.statement.append(`FROM ${this.tableName} `);

    if (this.tableAlias) {
      this.statement.append(`${this.tableAlias} `);
    }

    return new SQLGeneralQuery<T>(
      this.statement,
      this.tableName,
      columns,
      this.tableAlias
    );
  }
}

class SQLGeneralQuery<T> extends SQLQuery {
  protected selectColumns: ISelectQueryParams<T> = {};
  protected parsedSelectColumns;

  constructor(
    query: SQLStatement,
    tableName: string,
    selectColumns: ISelectQueryParams<T>,
    tableAlias?: string
  ) {
    super(query, tableName, tableAlias);
    this.selectColumns = selectColumns;
    this.parsedSelectColumns = Object.keys(this.selectColumns).reduce(
      (acc, curr) => {
        const key = curr as keyof T;
        const columnValue = this.selectColumns[key];

        if (!this.selectColumns[key]) return acc;

        if (this.selectColumns[key] === true)
          return { ...acc, [key]: columnValue };

        const columnValueObject = columnValue as ISqlFunctionObject<T>;

        if (columnValueObject.functionValue === SqlFunction.YEAR)
          return { ...acc, [key]: { ...columnValueObject, hideAlias: true } };

        if (columnValueObject.functionValue === SqlFunction.ROW_NUMBER)
          return { ...acc, [key]: true };

        return acc;
      },
      {} as ISelectQueryParams<T>
    );
  }

  where(params: IWhereParam<T>) {
    if (!params.and)
      return new SQLGeneralQuery<T>(
        this.statement,
        this.tableName,
        this.selectColumns,
        this.tableAlias
      );

    const paramKeys = Object.keys(params.and) as (keyof T)[];

    if (!paramKeys.length)
      return new SQLGeneralQuery<T>(
        this.statement,
        this.tableName,
        this.selectColumns,
        this.tableAlias
      );

    this.statement.append(`WHERE `);

    paramKeys.forEach((key, index) => {
      const value = params.and[key];

      const aliasKey = this.tableAlias
        ? `${this.tableAlias}.${String(key)}`
        : String(key);
      this.statement.append(aliasKey);

      if (value.between) {
        this.statement.append(
          SQL` BETWEEN ${value.between[0]} AND ${value.between[1]} `
        );
      } else if (value.equals !== undefined) {
        this.statement.append(SQL` = ${value.equals} `);
      } else if (value.in) {
        this.statement.append(" IN (");

        value.in.forEach((item, index) => {
          if (typeof item === "string") {
            this.statement.append(SQL`${"'" + item + "'"}`);
          } else {
            this.statement.append(`${item}`);
          }

          if (index === value.in!.length - 1) {
            this.statement.append(") ");
          } else {
            this.statement.append(", ");
          }
        });
      }

      if (index !== paramKeys.length - 1) {
        this.statement.append(`AND `);
      }
    });

    return new SQLGeneralQuery<T>(
      this.statement,
      this.tableName,
      this.selectColumns,
      this.tableAlias
    );
  }

  groupBy() {
    const values = this.getSelectValues(this.parsedSelectColumns);

    this.statement.append(`GROUP BY ${values.join(", ")} `);

    return new SQLGeneralQuery<T>(
      this.statement,
      this.tableName,
      this.selectColumns,
      this.tableAlias
    );
  }

  orderBy(columns: Partial<Record<keyof T, IOrderBy | true>>) {
    const values: string[] = [];

    Object.keys(columns).forEach((item) => {
      const key = item as keyof T;
      const value = columns[key];
      const aliasKey = this.tableAlias ? `${this.tableAlias}.${item}` : item;

      if (value) values.push(aliasKey);

      if (value !== true) {
        values.push(` ${value?.toUpperCase()}`);
      }
    });

    this.statement.append(`ORDER BY ${values.join(", ")} `);

    return new SQLGeneralQuery<T>(
      this.statement,
      this.tableName,
      this.selectColumns,
      this.tableAlias
    );
  }

  limit(value: number) {
    this.statement.append(`LIMIT ${value} `);

    return new SQLGeneralQuery<T>(
      this.statement,
      this.tableName,
      this.selectColumns,
      this.tableAlias
    );
  }
}

export class SQLService {
  constructor() {}

  query<T>(tableName: string, tableAlias?: string) {
    return new SQLSelectQuery<T>(SQL``, tableName, tableAlias);
  }
}
