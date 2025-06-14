import { get_error_response } from './response.helper';
import QueryHelper from './query.helper';
import { PrismaClient } from '@prisma/client';

interface FilterCondition {
    field: string;
    condition: string;
    value: any;
}

interface FilterGroup {
    logic: 'AND' | 'OR';
    filters: (FilterCondition | FilterGroup)[];
}

type Filter = FilterCondition | FilterGroup;

interface SelectDataParams {
    table: string;
    strGetColumn: string;
    filter?: Filter | Filter[] | null;
    logic?: 'AND' | 'OR' | null;
    limit?: number | null;
    page?: number | null;
    sort?: string | null;
    order?: string | null;
    queryJoin?: string | null;
    configData?: ((data: any[]) => any[]) | null;
}

interface SelectDataResult {
    data: any[];
    total_page: number;
}

function buildWhereQuery(filter: Filter | Filter[] | null, table: string): string {
    if (!filter) {
        return `WHERE ${table}.deleted_at IS NULL`;
    }

    function parseFilter(obj: Filter): string {
        if ('logic' in obj && Array.isArray((obj as FilterGroup).filters)) {
            const group = obj as FilterGroup;
            const subConditions = group.filters.map(parseFilter).filter(Boolean);
            if (subConditions.length === 0) return "";
            return `(${subConditions.join(` ${group.logic} `)})`;
        }

        const condition = obj as FilterCondition;
        if (!condition.field || !condition.condition) return "";

        const { field, condition: cond, value } = condition;

        switch (cond) {
            case 'contains':
                return value ? `(${field} IS NOT NULL AND ${field} LIKE '%${value}%')` : `(${field} LIKE '%%' OR ${field} IS NULL)`;
            case 'not_contains':
                return value ? `(${field} IS NOT NULL AND ${field} NOT LIKE '%${value}%')` : `(${field} NOT LIKE '%%')`;
            case 'in':
                if (Array.isArray(value) && value.length > 0) {
                    const inList = value.map(v => typeof v === 'string' ? `'${v}'` : v).join(',');
                    return `${field} IN (${inList})`;
                }
                break;
            case 'notin':
                if (Array.isArray(value) && value.length > 0) {
                    const notInList = value.map(v => `'${v}'`).join(',');
                    return `${field} NOT IN (${notInList})`;
                }
                break;
            case 'startswith':
                return value ? `(${field} IS NOT NULL AND ${field} LIKE '${value}%')` : `(${field} LIKE '%%' OR ${field} IS NULL)`;
            case 'endswith':
                return value ? `(${field} IS NOT NULL AND ${field} LIKE '%${value}')` : `(${field} LIKE '%%' OR ${field} IS NULL)`;
            case '=':
                return value !== null ? `${field} = '${value}'` : `${field} IS NULL`;
            case '<>':
                return value !== null ? `${field} <> '${value}'` : `${field} IS NOT NULL`;
            case '<':
                return `${field} < ${value === '' ? 0 : value}`;
            case '>':
                return `${field} > ${value === '' ? 0 : value}`;
            case '<=':
                return `${field} <= ${value === '' ? 0 : value}`;
            case '>=':
                return `${field} >= ${value === '' ? 0 : value}`;
            default:
                return "";
        }
        return "";
    }

    let whereClause = "";
    if (Array.isArray(filter)) {
        const conditions = filter.map(parseFilter).filter(Boolean);
        whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')} AND ${table}.deleted_at IS NULL`
            : `WHERE ${table}.deleted_at IS NULL`;
    } else {
        const condition = parseFilter(filter);
        whereClause = condition
            ? `WHERE ${condition} AND ${table}.deleted_at IS NULL`
            : `WHERE ${table}.deleted_at IS NULL`;
    }

    return whereClause;
}

export async function executeSelectData(params: SelectDataParams): Promise<SelectDataResult> {
    const {
        table,
        strGetColumn,
        filter = null,
        logic = null,
        limit = null,
        page = null,
        sort = null,
        order = null,
        queryJoin = null,
        configData = null,
    } = params;

    const buildWhere = buildWhereQuery(filter, table);

    const parsedLimit = limit ? parseInt(String(limit)) : null;
    const parsedPage = page ? parseInt(String(page)) : null;
    const skip = parsedLimit && parsedPage ? parsedLimit * (parsedPage - 1) : 0;

    const optOrder = order ? ` ${order.toUpperCase()} ` : '';
    const sortColumn = sort || null;
    const buildSort = sortColumn ? `ORDER BY ${sortColumn} ${optOrder}` : '';
    const buildLimit = parsedLimit ? `LIMIT ${parsedLimit}` : '';
    const buildOffset = skip ? `OFFSET ${skip}` : '';

    const idColumn = table === 'categories' ? 'category_id' : 'id';

    const queryGetIdTable = `
        SELECT DISTINCT ${idColumn}
        FROM (
            SELECT DISTINCT ${table}.${idColumn} ${sort ? `, ${sort} as sort_column` : ''}
            FROM ${table}
            ${queryJoin || ''}
            ${buildWhere}
            ${buildSort}
            ${buildLimit}
            ${buildOffset}
        ) AS sub
    `;

    const idResult = await QueryHelper.queryRaw<Record<string, any>>(queryGetIdTable);
    const resultIds = idResult
        .map(row => row[idColumn])
        .filter((id): id is number | string => id !== undefined && id !== null);

    const whereCondition = resultIds.length
        ? `${table}.${idColumn} IN (${resultIds.map(id => typeof id === 'string' ? `'${id}'` : id).join(',')})`
        : '1=0';

    const queryGetTime = `${table}.created_at, ${table}.updated_at, ${table}.deleted_at`;

    const queryPrimary = `
        SELECT DISTINCT ${queryJoin ? `${table}.` : ''}${idColumn}, ${strGetColumn}, ${queryGetTime}
        FROM ${table}
        ${queryJoin || ''}
        WHERE ${whereCondition}
        ${buildSort}
    `;

    let data = await QueryHelper.queryRaw(queryPrimary);
    if (configData && typeof configData === 'function') {
        data = configData(data);
    }

    const totalCountQuery = `
        SELECT COUNT(*) AS total 
        FROM ${table}
        ${queryJoin || ''} 
        ${buildWhere}
    `;

    const totalCountResult = await QueryHelper.queryRaw<{ total: number }>(totalCountQuery);
    const totalCount = Number(totalCountResult[0].total);

    const totalPage = parsedLimit ? Math.ceil(totalCount / parsedLimit) : 1;

    return {
        data,
        total_page: totalPage,
    };
}

async function check_reference_existence(
    model: any,
    column_name: string,
    value: any,
    error_code: string
): Promise<{ status: number; error: any } | null> {
    const record = await model.findOne({
        where: {
            [column_name]: value,
            deletedAt: null
        }
    });

    if (record) {
        return {
            status: 401,
            error: get_error_response(error_code, 406)
        };
    }

    return null;
}

