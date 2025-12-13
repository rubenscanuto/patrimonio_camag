import { supabase } from './supabaseClient';
import {
  Property,
  Document,
  Employee,
  PropertyTag,
  Owner,
  AIConfig,
  CloudAccount,
  MonthlyIndexData,
  LogEntry,
  TrashItem,
} from '../types';

export const propertiesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(convertPropertyFromDB);
  },

  async create(property: Property) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbProperty = convertPropertyToDB(property);
    const { data, error } = await supabase
      .from('properties')
      .insert({ ...dbProperty, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return convertPropertyFromDB(data);
  },

  async update(property: Property) {
    const dbProperty = convertPropertyToDB(property);
    const { error } = await supabase
      .from('properties')
      .update(dbProperty)
      .eq('id', property.id);

    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const maintenanceService = {
  async getByProperty(propertyId: string) {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('property_id', propertyId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data.map(convertMaintenanceFromDB);
  },

  async create(record: any, propertyId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('maintenance_records')
      .insert({
        id: record.id,
        user_id: user.id,
        property_id: propertyId,
        date: record.date,
        description: record.description,
        cost: record.cost,
        status: record.status,
      })
      .select()
      .single();

    if (error) throw error;
    return convertMaintenanceFromDB(data);
  },

  async update(record: any) {
    const { error } = await supabase
      .from('maintenance_records')
      .update({
        date: record.date,
        description: record.description,
        cost: record.cost,
        status: record.status,
      })
      .eq('id', record.id);

    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('maintenance_records')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const documentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(convertDocumentFromDB);
  },

  async create(document: Document) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbDocument = convertDocumentToDB(document);
    const { data, error } = await supabase
      .from('documents')
      .insert({ ...dbDocument, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return convertDocumentFromDB(data);
  },

  async update(document: Document) {
    const dbDocument = convertDocumentToDB(document);
    const { error } = await supabase
      .from('documents')
      .update(dbDocument)
      .eq('id', document.id);

    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const employeesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(convertEmployeeFromDB);
  },

  async create(employee: Employee) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbEmployee = convertEmployeeToDB(employee);
    const { data, error } = await supabase
      .from('employees')
      .insert({ ...dbEmployee, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return convertEmployeeFromDB(data);
  },

  async update(employee: Employee) {
    const dbEmployee = convertEmployeeToDB(employee);
    const { error } = await supabase
      .from('employees')
      .update(dbEmployee)
      .eq('id', employee.id);

    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const tagsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('property_tags')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(convertTagFromDB);
  },

  async create(tag: PropertyTag) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('property_tags')
      .insert({
        id: tag.id,
        user_id: user.id,
        label: tag.label,
        color: tag.color,
      })
      .select()
      .single();

    if (error) throw error;
    return convertTagFromDB(data);
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('property_tags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const ownersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('owners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(convertOwnerFromDB);
  },

  async create(owner: Owner) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbOwner = convertOwnerToDB(owner);
    const { data, error } = await supabase
      .from('owners')
      .insert({ ...dbOwner, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return convertOwnerFromDB(data);
  },

  async update(owner: Owner) {
    const dbOwner = convertOwnerToDB(owner);
    const { error } = await supabase
      .from('owners')
      .update(dbOwner)
      .eq('id', owner.id);

    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('owners')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const aiConfigsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('ai_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(convertAIConfigFromDB);
  },

  async create(config: AIConfig) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('ai_configs')
      .insert({
        id: config.id,
        user_id: user.id,
        label: config.label,
        provider: config.provider,
        api_key: config.apiKey,
        model_name: config.modelName,
        is_active: config.isActive,
      })
      .select()
      .single();

    if (error) throw error;
    return convertAIConfigFromDB(data);
  },

  async update(config: AIConfig) {
    const { error } = await supabase
      .from('ai_configs')
      .update({
        label: config.label,
        provider: config.provider,
        api_key: config.apiKey,
        model_name: config.modelName,
        is_active: config.isActive,
      })
      .eq('id', config.id);

    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('ai_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const cloudAccountsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('cloud_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(convertCloudAccountFromDB);
  },

  async create(account: CloudAccount) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('cloud_accounts')
      .insert({
        id: account.id,
        user_id: user.id,
        provider: account.provider,
        account_name: account.accountName,
        credentials: account.credentials || {},
        is_connected: account.isConnected,
        auth_date: account.authDate,
      })
      .select()
      .single();

    if (error) throw error;
    return convertCloudAccountFromDB(data);
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('cloud_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export const indicesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('indices_database')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data.map((item: any) => ({
      date: item.date,
      indices: item.indices,
    }));
  },

  async upsert(indices: MonthlyIndexData[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const records = indices.map((item) => ({
      user_id: user.id,
      date: item.date,
      indices: item.indices,
    }));

    const { error } = await supabase
      .from('indices_database')
      .upsert(records, { onConflict: 'user_id,date' });

    if (error) throw error;
  },
};

export const logsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    return data.map(convertLogFromDB);
  },

  async create(log: LogEntry) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('logs')
      .insert({
        id: log.id,
        user_id: user.id,
        timestamp: log.timestamp,
        action: log.action,
        entity_type: log.entityType,
        description: log.description,
        user_name: log.user,
        details: log.details,
      });

    if (error) throw error;
  },
};

export const trashService = {
  async getAll() {
    const { data, error } = await supabase
      .from('trash')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(convertTrashFromDB);
  },

  async create(item: TrashItem) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('trash')
      .insert({
        id: item.id,
        user_id: user.id,
        deleted_at: item.deletedAt,
        original_data: item.originalData,
        entity_type: item.entityType,
        name: item.name,
      });

    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('trash')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

function convertPropertyFromDB(data: any): Property {
  return {
    id: data.id,
    name: data.name,
    address: data.address,
    addressComponents: data.address_components,
    value: Number(data.value),
    purchaseValue: Number(data.purchase_value),
    purchaseDate: data.purchase_date,
    seller: data.seller,
    status: data.status,
    imageUrl: data.image_url,
    tenantName: data.tenant_name,
    contractExpiry: data.contract_expiry,
    registryData: data.registry_data,
    customFields: data.custom_fields,
    tags: data.tags || [],
    coordinates: data.coordinates,
    marketValue: data.market_value ? Number(data.market_value) : undefined,
    ownerId: data.owner_id,
  };
}

function convertPropertyToDB(property: Property) {
  return {
    id: property.id,
    owner_id: property.ownerId,
    name: property.name,
    address: property.address,
    address_components: property.addressComponents,
    value: property.value,
    purchase_value: property.purchaseValue,
    purchase_date: property.purchaseDate,
    seller: property.seller,
    status: property.status,
    image_url: property.imageUrl,
    tenant_name: property.tenantName,
    contract_expiry: property.contractExpiry,
    registry_data: property.registryData,
    custom_fields: property.customFields,
    tags: property.tags || [],
    coordinates: property.coordinates,
    market_value: property.marketValue,
  };
}

function convertMaintenanceFromDB(data: any) {
  return {
    id: data.id,
    date: data.date,
    description: data.description,
    cost: Number(data.cost),
    status: data.status,
  };
}

function convertDocumentFromDB(data: any): Document {
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    uploadDate: data.upload_date,
    summary: data.summary,
    relatedPropertyId: data.related_property_id,
    relatedOwnerId: data.related_owner_id,
    contentRaw: data.content_raw,
    aiAnalysis: data.ai_analysis,
  };
}

function convertDocumentToDB(document: Document) {
  return {
    id: document.id,
    name: document.name,
    category: document.category,
    upload_date: document.uploadDate,
    summary: document.summary,
    related_property_id: document.relatedPropertyId,
    related_owner_id: document.relatedOwnerId,
    content_raw: document.contentRaw,
    ai_analysis: document.aiAnalysis,
  };
}

function convertEmployeeFromDB(data: any): Employee {
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    assignedProperties: data.assigned_properties || [],
    contact: data.contact,
    activeTasks: data.active_tasks,
    status: data.status,
  };
}

function convertEmployeeToDB(employee: Employee) {
  return {
    id: employee.id,
    name: employee.name,
    role: employee.role,
    assigned_properties: employee.assignedProperties || [],
    contact: employee.contact,
    active_tasks: employee.activeTasks,
    status: employee.status,
  };
}

function convertTagFromDB(data: any): PropertyTag {
  return {
    id: data.id,
    label: data.label,
    color: data.color,
  };
}

function convertOwnerFromDB(data: any): Owner {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    document: data.document,
    profession: data.profession,
    naturality: data.naturality,
    maritalStatus: data.marital_status,
    rg: data.rg,
    municipalRegistration: data.municipal_registration,
    address: data.address,
    legalRepresentative: data.legal_representative,
    legalRepresentativeCpf: data.legal_representative_cpf,
    photoUrl: data.photo_url,
    cnaes: data.cnaes || [],
  };
}

function convertOwnerToDB(owner: Owner) {
  return {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    document: owner.document,
    profession: owner.profession,
    naturality: owner.naturality,
    marital_status: owner.maritalStatus,
    rg: owner.rg,
    municipal_registration: owner.municipalRegistration,
    address: owner.address,
    legal_representative: owner.legalRepresentative,
    legal_representative_cpf: owner.legalRepresentativeCpf,
    photo_url: owner.photoUrl,
    cnaes: owner.cnaes || [],
  };
}

function convertAIConfigFromDB(data: any): AIConfig {
  return {
    id: data.id,
    label: data.label,
    provider: data.provider,
    apiKey: data.api_key,
    modelName: data.model_name,
    isActive: data.is_active,
  };
}

function convertCloudAccountFromDB(data: any): CloudAccount {
  return {
    id: data.id,
    provider: data.provider,
    accountName: data.account_name,
    credentials: data.credentials,
    isConnected: data.is_connected,
    authDate: data.auth_date,
  };
}

function convertLogFromDB(data: any): LogEntry {
  return {
    id: data.id,
    timestamp: data.timestamp,
    action: data.action,
    entityType: data.entity_type,
    description: data.description,
    user: data.user_name,
    details: data.details,
  };
}

function convertTrashFromDB(data: any): TrashItem {
  return {
    id: data.id,
    deletedAt: data.deleted_at,
    originalData: data.original_data,
    entityType: data.entity_type,
    name: data.name,
  };
}
