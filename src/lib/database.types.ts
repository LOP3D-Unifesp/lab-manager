
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "availability_slots": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"profile_id": string,"schedule_period_id": string,"starts_at": string,"updated_at": string,"weekday": number,"work_mode": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"profile_id": string,"schedule_period_id": string,"starts_at": string,"updated_at"?: string,"weekday": number,"work_mode"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"profile_id"?: string,"schedule_period_id"?: string,"starts_at"?: string,"updated_at"?: string,"weekday"?: number,"work_mode"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_slots_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "availability_slots_schedule_period_id_fkey"
      columns: ["schedule_period_id"]
isOneToOne: false
      referencedRelation: "lab_schedule_periods"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment": {
                  Row: {
                    "asset_tag": string | null,"created_at": string,"id": string,"location": string | null,"model": string | null,"name": string,"notes": string | null,"status": Database["public"]['Enums']["equipment_status"],"type_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_tag"?: string | null,"created_at"?: string,"id"?: string,"location"?: string | null,"model"?: string | null,"name": string,"notes"?: string | null,"status"?: Database["public"]['Enums']["equipment_status"],"type_id": string,"updated_at"?: string
                  }
                  Update: {
                    "asset_tag"?: string | null,"created_at"?: string,"id"?: string,"location"?: string | null,"model"?: string | null,"name"?: string,"notes"?: string | null,"status"?: Database["public"]['Enums']["equipment_status"],"type_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipment_type_id_fkey"
      columns: ["type_id"]
isOneToOne: false
      referencedRelation: "equipment_types"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment_bookings": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"consumed_amount": number | null,"created_at": string,"ends_at": string,"equipment_id": string,"estimated_duration_minutes": number,"id": string,"material_id": string | null,"notes": string | null,"profile_id": string,"project_id": string | null,"project_name": string,"rejected_at": string | null,"rejected_by": string | null,"rejected_reason": string | null,"spool_id": string | null,"starts_at": string,"status": Database["public"]['Enums']["booking_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"consumed_amount"?: number | null,"created_at"?: string,"ends_at": string,"equipment_id": string,"estimated_duration_minutes": number,"id"?: string,"material_id"?: string | null,"notes"?: string | null,"profile_id": string,"project_id"?: string | null,"project_name": string,"rejected_at"?: string | null,"rejected_by"?: string | null,"rejected_reason"?: string | null,"spool_id"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"consumed_amount"?: number | null,"created_at"?: string,"ends_at"?: string,"equipment_id"?: string,"estimated_duration_minutes"?: number,"id"?: string,"material_id"?: string | null,"notes"?: string | null,"profile_id"?: string,"project_id"?: string | null,"project_name"?: string,"rejected_at"?: string | null,"rejected_by"?: string | null,"rejected_reason"?: string | null,"spool_id"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipment_bookings_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_bookings_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_bookings_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_bookings_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_bookings_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_bookings_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_bookings_rejected_by_fkey"
      columns: ["rejected_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_bookings_spool_id_fkey"
      columns: ["spool_id"]
isOneToOne: false
      referencedRelation: "material_spools"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment_maintenance": {
                  Row: {
                    "created_at": string,"ended_at": string | null,"ended_by": string | null,"equipment_id": string,"expected_return_on": string | null,"id": string,"notes": string | null,"reason": string,"resolution_notes": string | null,"started_at": string,"started_by": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ended_at"?: string | null,"ended_by"?: string | null,"equipment_id": string,"expected_return_on"?: string | null,"id"?: string,"notes"?: string | null,"reason": string,"resolution_notes"?: string | null,"started_at"?: string,"started_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ended_at"?: string | null,"ended_by"?: string | null,"equipment_id"?: string,"expected_return_on"?: string | null,"id"?: string,"notes"?: string | null,"reason"?: string,"resolution_notes"?: string | null,"started_at"?: string,"started_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipment_maintenance_ended_by_fkey"
      columns: ["ended_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_maintenance_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_maintenance_started_by_fkey"
      columns: ["started_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment_materials": {
                  Row: {
                    "created_at": string,"equipment_id": string,"material_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"equipment_id": string,"material_id": string
                  }
                  Update: {
                    "created_at"?: string,"equipment_id"?: string,"material_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "equipment_materials_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "equipment_materials_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment_types": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"name": string,"updated_at": string,"uses_material": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string,"uses_material"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string,"uses_material"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"feedback_reports": {
                  Row: {
                    "coordinator_note": string | null,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["feedback_kind"],"message": string,"page_path": string | null,"status": Database["public"]['Enums']["feedback_status"],"updated_at": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "coordinator_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["feedback_kind"],"message": string,"page_path"?: string | null,"status"?: Database["public"]['Enums']["feedback_status"],"updated_at"?: string,"user_agent"?: string | null
                  }
                  Update: {
                    "coordinator_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["feedback_kind"],"message"?: string,"page_path"?: string | null,"status"?: Database["public"]['Enums']["feedback_status"],"updated_at"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_reports_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"funding_agencies": {
                  Row: {
                    "acronym": string,"created_at": string,"id": string,"is_active": boolean,"name": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acronym": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "acronym"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"auth_user_id": string | null,"created_at": string,"email": string | null,"expires_at": string,"id": string,"invited_by": string,"last_sent_at": string,"opened_at": string | null,"role": Database["public"]['Enums']["user_role"],"send_count": number,"status": Database["public"]['Enums']["invitation_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"auth_user_id"?: string | null,"created_at"?: string,"email"?: string | null,"expires_at": string,"id"?: string,"invited_by": string,"last_sent_at"?: string,"opened_at"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"send_count"?: number,"status"?: Database["public"]['Enums']["invitation_status"],"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"auth_user_id"?: string | null,"created_at"?: string,"email"?: string | null,"expires_at"?: string,"id"?: string,"invited_by"?: string,"last_sent_at"?: string,"opened_at"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"send_count"?: number,"status"?: Database["public"]['Enums']["invitation_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lab_schedule_periods": {
                  Row: {
                    "created_at": string,"created_by": string | null,"ends_at": string,"id": string,"is_active": boolean,"sort_order": number,"starts_at": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"ends_at": string,"id"?: string,"is_active"?: boolean,"sort_order": number,"starts_at": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"ends_at"?: string,"id"?: string,"is_active"?: boolean,"sort_order"?: number,"starts_at"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lab_schedule_periods_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lab_schedule_periods_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lab_settings": {
                  Row: {
                    "acronym": string | null,"created_at": string,"created_by": string | null,"dinner_ends_at": string,"dinner_starts_at": string,"id": boolean,"lunch_ends_at": string,"lunch_starts_at": string,"name": string | null,"operating_weekdays": (number)[],"privacy_contact_email": string | null,"setup_completed_at": string | null,"timezone": string,"updated_at": string,"updated_by": string | null,"workspace_capacity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acronym"?: string | null,"created_at"?: string,"created_by"?: string | null,"dinner_ends_at"?: string,"dinner_starts_at"?: string,"id"?: boolean,"lunch_ends_at"?: string,"lunch_starts_at"?: string,"name"?: string | null,"operating_weekdays"?: (number)[],"privacy_contact_email"?: string | null,"setup_completed_at"?: string | null,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null,"workspace_capacity"?: number
                  }
                  Update: {
                    "acronym"?: string | null,"created_at"?: string,"created_by"?: string | null,"dinner_ends_at"?: string,"dinner_starts_at"?: string,"id"?: boolean,"lunch_ends_at"?: string,"lunch_starts_at"?: string,"name"?: string | null,"operating_weekdays"?: (number)[],"privacy_contact_email"?: string | null,"setup_completed_at"?: string | null,"timezone"?: string,"updated_at"?: string,"updated_by"?: string | null,"workspace_capacity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lab_settings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lab_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"maintenance_blocks": {
                  Row: {
                    "created_at": string,"created_by": string,"ends_at": string,"equipment_id": string,"id": string,"notes": string | null,"reason": string,"starts_at": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"ends_at": string,"equipment_id": string,"id"?: string,"notes"?: string | null,"reason": string,"starts_at": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"ends_at"?: string,"equipment_id"?: string,"id"?: string,"notes"?: string | null,"reason"?: string,"starts_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_blocks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_blocks_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    }
                  ]
                },"maintenance_requests": {
                  Row: {
                    "assigned_to": string | null,"created_at": string,"description": string,"equipment_id": string,"id": string,"photo_paths": (string)[],"requested_by": string | null,"resolution_notes": string | null,"resolved_at": string | null,"status": Database["public"]['Enums']["maintenance_request_status"],"updated_at": string,"urgency": Database["public"]['Enums']["maintenance_urgency"]
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"created_at"?: string,"description": string,"equipment_id": string,"id"?: string,"photo_paths"?: (string)[],"requested_by"?: string | null,"resolution_notes"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["maintenance_request_status"],"updated_at"?: string,"urgency"?: Database["public"]['Enums']["maintenance_urgency"]
                  }
                  Update: {
                    "assigned_to"?: string | null,"created_at"?: string,"description"?: string,"equipment_id"?: string,"id"?: string,"photo_paths"?: (string)[],"requested_by"?: string | null,"resolution_notes"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["maintenance_request_status"],"updated_at"?: string,"urgency"?: Database["public"]['Enums']["maintenance_urgency"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "maintenance_requests_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_requests_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "maintenance_requests_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"material_spools": {
                  Row: {
                    "color_hex": string | null,"color_name": string,"created_at": string,"created_by": string | null,"current_amount": number,"diameter_mm": number | null,"id": string,"initial_amount": number,"last_dried_on": string | null,"lot_number": string | null,"manufacturer": string | null,"material_id": string,"notes": string | null,"opened_on": string | null,"project_id": string | null,"status": Database["public"]['Enums']["spool_status"],"storage_location": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color_hex"?: string | null,"color_name": string,"created_at"?: string,"created_by"?: string | null,"current_amount": number,"diameter_mm"?: number | null,"id"?: string,"initial_amount": number,"last_dried_on"?: string | null,"lot_number"?: string | null,"manufacturer"?: string | null,"material_id": string,"notes"?: string | null,"opened_on"?: string | null,"project_id"?: string | null,"status"?: Database["public"]['Enums']["spool_status"],"storage_location"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "color_hex"?: string | null,"color_name"?: string,"created_at"?: string,"created_by"?: string | null,"current_amount"?: number,"diameter_mm"?: number | null,"id"?: string,"initial_amount"?: number,"last_dried_on"?: string | null,"lot_number"?: string | null,"manufacturer"?: string | null,"material_id"?: string,"notes"?: string | null,"opened_on"?: string | null,"project_id"?: string | null,"status"?: Database["public"]['Enums']["spool_status"],"storage_location"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_spools_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_spools_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_spools_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "category": Database["public"]['Enums']["material_category"],"created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"unit": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["material_category"],"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"unit"?: string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["material_category"],"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"unit"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profile_funding_grants": {
                  Row: {
                    "agency": Database["public"]['Enums']["funding_agency"],"agency_other": string | null,"created_at": string,"grant_name": string | null,"id": string,"monthly_value": number | null,"profile_id": string,"weekly_hours": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agency": Database["public"]['Enums']["funding_agency"],"agency_other"?: string | null,"created_at"?: string,"grant_name"?: string | null,"id"?: string,"monthly_value"?: number | null,"profile_id": string,"weekly_hours"?: number | null
                  }
                  Update: {
                    "agency"?: Database["public"]['Enums']["funding_agency"],"agency_other"?: string | null,"created_at"?: string,"grant_name"?: string | null,"id"?: string,"monthly_value"?: number | null,"profile_id"?: string,"weekly_hours"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_funding_grants_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_private_data": {
                  Row: {
                    "address_complement": string | null,"address_number": string | null,"birth_date": string | null,"city": string | null,"country": string | null,"cpf": string | null,"created_at": string,"neighborhood": string | null,"postal_code": string | null,"profile_id": string,"rg": string | null,"state": string | null,"street": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_complement"?: string | null,"address_number"?: string | null,"birth_date"?: string | null,"city"?: string | null,"country"?: string | null,"cpf"?: string | null,"created_at"?: string,"neighborhood"?: string | null,"postal_code"?: string | null,"profile_id": string,"rg"?: string | null,"state"?: string | null,"street"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_complement"?: string | null,"address_number"?: string | null,"birth_date"?: string | null,"city"?: string | null,"country"?: string | null,"cpf"?: string | null,"created_at"?: string,"neighborhood"?: string | null,"postal_code"?: string | null,"profile_id"?: string,"rg"?: string | null,"state"?: string | null,"street"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_private_data_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_skills": {
                  Row: {
                    "created_at": string,"profile_id": string,"skill_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"profile_id": string,"skill_id": string
                  }
                  Update: {
                    "created_at"?: string,"profile_id"?: string,"skill_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_skills_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "academic_affiliation": Database["public"]['Enums']["academic_affiliation"] | null,"avatar_url": string | null,"bio": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"is_active": boolean,"is_maintainer": boolean,"lattes_url": string | null,"nationality_country_code": string | null,"phone": string | null,"requires_booking_approval": boolean,"role": Database["public"]['Enums']["user_role"],"updated_at": string,"weekly_workload_hours": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_affiliation"?: Database["public"]['Enums']["academic_affiliation"] | null,"avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"email": string,"full_name": string,"id": string,"is_active"?: boolean,"is_maintainer"?: boolean,"lattes_url"?: string | null,"nationality_country_code"?: string | null,"phone"?: string | null,"requires_booking_approval"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"weekly_workload_hours"?: number | null
                  }
                  Update: {
                    "academic_affiliation"?: Database["public"]['Enums']["academic_affiliation"] | null,"avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"is_maintainer"?: boolean,"lattes_url"?: string | null,"nationality_country_code"?: string | null,"phone"?: string | null,"requires_booking_approval"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"weekly_workload_hours"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"project_funding": {
                  Row: {
                    "agency_id": string,"created_at": string,"ends_on": string | null,"grant_name": string | null,"id": string,"process_number": string | null,"project_id": string,"starts_on": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_id": string,"created_at"?: string,"ends_on"?: string | null,"grant_name"?: string | null,"id"?: string,"process_number"?: string | null,"project_id": string,"starts_on"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "agency_id"?: string,"created_at"?: string,"ends_on"?: string | null,"grant_name"?: string | null,"id"?: string,"process_number"?: string | null,"project_id"?: string,"starts_on"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_funding_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "funding_agencies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_funding_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_funding_items": {
                  Row: {
                    "amount": number,"category": Database["public"]['Enums']["project_funding_category"],"created_at": string,"description": string | null,"funding_id": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category": Database["public"]['Enums']["project_funding_category"],"created_at"?: string,"description"?: string | null,"funding_id": string,"id"?: string
                  }
                  Update: {
                    "amount"?: number,"category"?: Database["public"]['Enums']["project_funding_category"],"created_at"?: string,"description"?: string | null,"funding_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_funding_items_funding_id_fkey"
      columns: ["funding_id"]
isOneToOne: false
      referencedRelation: "project_funding"
      referencedColumns: ["id"]
    }
                  ]
                },"project_members": {
                  Row: {
                    "added_by": string | null,"created_at": string,"profile_id": string,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"profile_id": string,"project_id": string
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"profile_id"?: string,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"project_task_assignees": {
                  Row: {
                    "created_at": string,"profile_id": string,"project_id": string,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"profile_id": string,"project_id": string,"task_id": string
                  }
                  Update: {
                    "created_at"?: string,"profile_id"?: string,"project_id"?: string,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_task_assignees_member_fkey"
      columns: ["project_id","profile_id"]
isOneToOne: false
      referencedRelation: "project_members"
      referencedColumns: ["project_id","profile_id"]
    },{
      foreignKeyName: "project_task_assignees_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_task_assignees_task_fkey"
      columns: ["task_id","project_id"]
isOneToOne: false
      referencedRelation: "project_tasks"
      referencedColumns: ["id","project_id"]
    }
                  ]
                },"project_tasks": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string | null,"due_on": string | null,"id": string,"position": number,"project_id": string,"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"due_on"?: string | null,"id"?: string,"position"?: number,"project_id": string,"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"due_on"?: string | null,"id"?: string,"position"?: number,"project_id"?: string,"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string | null,"ends_on": string | null,"id": string,"name": string,"starts_on": string | null,"status": Database["public"]['Enums']["project_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"ends_on"?: string | null,"id"?: string,"name": string,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"ends_on"?: string | null,"id"?: string,"name"?: string,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"purchase_requests": {
                  Row: {
                    "actual_amount": number | null,"created_at": string,"decided_at": string | null,"decided_by": string | null,"delivered_at": string | null,"estimated_amount": number,"for_maintenance": boolean,"funding_category": Database["public"]['Enums']["project_funding_category"] | null,"id": string,"item": string,"maintenance_request_id": string | null,"notes": string | null,"project_id": string | null,"purchased_at": string | null,"quantity": number,"rejected_reason": string | null,"requested_by": string | null,"status": Database["public"]['Enums']["purchase_status"],"updated_at": string,"urgency": Database["public"]['Enums']["purchase_urgency"],"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_amount"?: number | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"delivered_at"?: string | null,"estimated_amount": number,"for_maintenance"?: boolean,"funding_category"?: Database["public"]['Enums']["project_funding_category"] | null,"id"?: string,"item": string,"maintenance_request_id"?: string | null,"notes"?: string | null,"project_id"?: string | null,"purchased_at"?: string | null,"quantity"?: number,"rejected_reason"?: string | null,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["purchase_status"],"updated_at"?: string,"urgency"?: Database["public"]['Enums']["purchase_urgency"],"url"?: string | null
                  }
                  Update: {
                    "actual_amount"?: number | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"delivered_at"?: string | null,"estimated_amount"?: number,"for_maintenance"?: boolean,"funding_category"?: Database["public"]['Enums']["project_funding_category"] | null,"id"?: string,"item"?: string,"maintenance_request_id"?: string | null,"notes"?: string | null,"project_id"?: string | null,"purchased_at"?: string | null,"quantity"?: number,"rejected_reason"?: string | null,"requested_by"?: string | null,"status"?: Database["public"]['Enums']["purchase_status"],"updated_at"?: string,"urgency"?: Database["public"]['Enums']["purchase_urgency"],"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "purchase_requests_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_maintenance_request_id_fkey"
      columns: ["maintenance_request_id"]
isOneToOne: false
      referencedRelation: "maintenance_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"skills": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cancel_booking":
{ Args: { "p_booking_id": string }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"cancelled_at": string | null,
"cancelled_by": string | null,
"consumed_amount": number | null,
"created_at": string,
"ends_at": string,
"equipment_id": string,
"estimated_duration_minutes": number,
"id": string,
"material_id": string | null,
"notes": string | null,
"profile_id": string,
"project_id": string | null,
"project_name": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejected_reason": string | null,
"spool_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "equipment_bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"complete_lab_installation":
{ Args: { "p_acronym": string,"p_name": string,"p_privacy_contact_email": string,"p_timezone": string }; Returns: {
              "acronym": string | null,
"created_at": string,
"created_by": string | null,
"dinner_ends_at": string,
"dinner_starts_at": string,
"id": boolean,
"lunch_ends_at": string,
"lunch_starts_at": string,
"name": string | null,
"operating_weekdays": (number)[],
"privacy_contact_email": string | null,
"setup_completed_at": string | null,
"timezone": string,
"updated_at": string,
"updated_by": string | null,
"workspace_capacity": number
            }
                          SetofOptions: {
        from: "*"
        to: "lab_settings"
        isOneToOne: true
        isSetofReturn: false
      } },
"configure_invitation_cleanup":
{ Args: { "p_function_url": string,"p_secret": string }; Returns: undefined
                           },
"create_booking":
{ Args: { "p_equipment_id": string,"p_estimated_duration_minutes": number,"p_material_id"?: string,"p_notes"?: string,"p_project_id": string,"p_spool_id"?: string,"p_starts_at": string }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"cancelled_at": string | null,
"cancelled_by": string | null,
"consumed_amount": number | null,
"created_at": string,
"ends_at": string,
"equipment_id": string,
"estimated_duration_minutes": number,
"id": string,
"material_id": string | null,
"notes": string | null,
"profile_id": string,
"project_id": string | null,
"project_name": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejected_reason": string | null,
"spool_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "equipment_bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_maintenance_block":
{ Args: { "p_ends_at": string,"p_equipment_id": string,"p_notes"?: string,"p_reason": string,"p_starts_at": string }; Returns: {
              "created_at": string,
"created_by": string,
"ends_at": string,
"equipment_id": string,
"id": string,
"notes": string | null,
"reason": string,
"starts_at": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "maintenance_blocks"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_profile":
{ Args: { "p_academic_affiliation"?: Database["public"]['Enums']["academic_affiliation"],"p_address_complement"?: string,"p_address_number"?: string,"p_bio"?: string,"p_birth_date"?: string,"p_city"?: string,"p_country"?: string,"p_cpf"?: string,"p_full_name": string,"p_lattes_url"?: string,"p_nationality_country_code"?: string,"p_neighborhood"?: string,"p_phone"?: string,"p_postal_code"?: string,"p_rg"?: string,"p_state"?: string,"p_street"?: string,"p_weekly_workload_hours"?: number }; Returns: {
              "academic_affiliation": Database["public"]['Enums']["academic_affiliation"] | null,
"avatar_url": string | null,
"bio": string | null,
"created_at": string,
"email": string,
"full_name": string,
"id": string,
"is_active": boolean,
"is_maintainer": boolean,
"lattes_url": string | null,
"nationality_country_code": string | null,
"phone": string | null,
"requires_booking_approval": boolean,
"role": Database["public"]['Enums']["user_role"],
"updated_at": string,
"weekly_workload_hours": number | null
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"delete_maintenance_block":
{ Args: { "p_block_id": string }; Returns: undefined
                           },
"end_equipment_maintenance":
{ Args: { "p_equipment_id": string,"p_notes"?: string }; Returns: {
              "created_at": string,
"ended_at": string | null,
"ended_by": string | null,
"equipment_id": string,
"expected_return_on": string | null,
"id": string,
"notes": string | null,
"reason": string,
"resolution_notes": string | null,
"started_at": string,
"started_by": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "equipment_maintenance"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_public_lab_identity":
{ Args: Record<PropertyKey, never>; Returns: {
              "acronym": string,"invitation_ttl_hours": number,"name": string,"privacy_contact_email": string
            }[]
                           },
"record_booking_usage":
{ Args: { "p_amount": number,"p_booking_id": string }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"cancelled_at": string | null,
"cancelled_by": string | null,
"consumed_amount": number | null,
"created_at": string,
"ends_at": string,
"equipment_id": string,
"estimated_duration_minutes": number,
"id": string,
"material_id": string | null,
"notes": string | null,
"profile_id": string,
"project_id": string | null,
"project_name": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejected_reason": string | null,
"spool_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "equipment_bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"record_invitation_opened":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"reject_booking":
{ Args: { "p_booking_id": string,"p_reason"?: string }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"cancelled_at": string | null,
"cancelled_by": string | null,
"consumed_amount": number | null,
"created_at": string,
"ends_at": string,
"equipment_id": string,
"estimated_duration_minutes": number,
"id": string,
"material_id": string | null,
"notes": string | null,
"profile_id": string,
"project_id": string | null,
"project_name": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejected_reason": string | null,
"spool_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "equipment_bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"replace_equipment_materials":
{ Args: { "p_equipment_id": string,"p_material_ids": (string)[] }; Returns: {
              "created_at": string,
"equipment_id": string,
"material_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "equipment_materials"
        isOneToOne: false
        isSetofReturn: true
      } },
"replace_profile_availability":
{ Args: { "p_profile_id": string,"p_slots": Json }; Returns: {
              "created_at": string,
"ends_at": string,
"id": string,
"profile_id": string,
"schedule_period_id": string,
"starts_at": string,
"updated_at": string,
"weekday": number,
"work_mode": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "availability_slots"
        isOneToOne: false
        isSetofReturn: true
      } },
"replace_profile_funding_grants":
{ Args: { "p_grants": Json,"p_profile_id": string }; Returns: {
              "agency": Database["public"]['Enums']["funding_agency"],
"agency_other": string | null,
"created_at": string,
"grant_name": string | null,
"id": string,
"monthly_value": number | null,
"profile_id": string,
"weekly_hours": number | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "profile_funding_grants"
        isOneToOne: false
        isSetofReturn: true
      } },
"replace_project_funding":
{ Args: { "p_funding": Json,"p_project_id": string }; Returns: undefined
                           },
"replace_project_members":
{ Args: { "p_profile_ids": (string)[],"p_project_id": string }; Returns: undefined
                           },
"save_lab_schedule_period":
{ Args: { "p_ends_at": string,"p_id": string,"p_is_active": boolean,"p_sort_order": number,"p_starts_at": string }; Returns: {
              "created_at": string,
"created_by": string | null,
"ends_at": string,
"id": string,
"is_active": boolean,
"sort_order": number,
"starts_at": string,
"updated_at": string,
"updated_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "lab_schedule_periods"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_booking_status":
{ Args: { "p_booking_id": string,"p_status": Database["public"]['Enums']["booking_status"] }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"cancelled_at": string | null,
"cancelled_by": string | null,
"consumed_amount": number | null,
"created_at": string,
"ends_at": string,
"equipment_id": string,
"estimated_duration_minutes": number,
"id": string,
"material_id": string | null,
"notes": string | null,
"profile_id": string,
"project_id": string | null,
"project_name": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejected_reason": string | null,
"spool_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "equipment_bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_maintenance_request_status":
{ Args: { "p_assigned_to"?: string,"p_request_id": string,"p_resolution_notes"?: string,"p_status": Database["public"]['Enums']["maintenance_request_status"] }; Returns: {
              "assigned_to": string | null,
"created_at": string,
"description": string,
"equipment_id": string,
"id": string,
"photo_paths": (string)[],
"requested_by": string | null,
"resolution_notes": string | null,
"resolved_at": string | null,
"status": Database["public"]['Enums']["maintenance_request_status"],
"updated_at": string,
"urgency": Database["public"]['Enums']["maintenance_urgency"]
            }
                          SetofOptions: {
        from: "*"
        to: "maintenance_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_my_avatar_url":
{ Args: { "p_avatar_url": string }; Returns: {
              "academic_affiliation": Database["public"]['Enums']["academic_affiliation"] | null,
"avatar_url": string | null,
"bio": string | null,
"created_at": string,
"email": string,
"full_name": string,
"id": string,
"is_active": boolean,
"is_maintainer": boolean,
"lattes_url": string | null,
"nationality_country_code": string | null,
"phone": string | null,
"requires_booking_approval": boolean,
"role": Database["public"]['Enums']["user_role"],
"updated_at": string,
"weekly_workload_hours": number | null
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_purchase_status":
{ Args: { "p_actual_amount"?: number,"p_reason"?: string,"p_request_id": string,"p_status": Database["public"]['Enums']["purchase_status"] }; Returns: {
              "actual_amount": number | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"delivered_at": string | null,
"estimated_amount": number,
"for_maintenance": boolean,
"funding_category": Database["public"]['Enums']["project_funding_category"] | null,
"id": string,
"item": string,
"maintenance_request_id": string | null,
"notes": string | null,
"project_id": string | null,
"purchased_at": string | null,
"quantity": number,
"rejected_reason": string | null,
"requested_by": string | null,
"status": Database["public"]['Enums']["purchase_status"],
"updated_at": string,
"urgency": Database["public"]['Enums']["purchase_urgency"],
"url": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "purchase_requests"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_task_assignees":
{ Args: { "p_profile_ids": (string)[],"p_task_id": string }; Returns: undefined
                           },
"start_equipment_maintenance":
{ Args: { "p_cancel_bookings"?: boolean,"p_equipment_id": string,"p_expected_return_on"?: string,"p_notes"?: string,"p_reason": string }; Returns: {
              "created_at": string,
"ended_at": string | null,
"ended_by": string | null,
"equipment_id": string,
"expected_return_on": string | null,
"id": string,
"notes": string | null,
"reason": string,
"resolution_notes": string | null,
"started_at": string,
"started_by": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "equipment_maintenance"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_booking":
{ Args: { "p_booking_id": string,"p_equipment_id": string,"p_estimated_duration_minutes": number,"p_material_id"?: string,"p_notes"?: string,"p_project_id": string,"p_spool_id"?: string,"p_starts_at": string }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"cancelled_at": string | null,
"cancelled_by": string | null,
"consumed_amount": number | null,
"created_at": string,
"ends_at": string,
"equipment_id": string,
"estimated_duration_minutes": number,
"id": string,
"material_id": string | null,
"notes": string | null,
"profile_id": string,
"project_id": string | null,
"project_name": string,
"rejected_at": string | null,
"rejected_by": string | null,
"rejected_reason": string | null,
"spool_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "equipment_bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_lab_breaks":
{ Args: { "p_dinner_ends_at": string,"p_dinner_starts_at": string,"p_lunch_ends_at": string,"p_lunch_starts_at": string }; Returns: {
              "acronym": string | null,
"created_at": string,
"created_by": string | null,
"dinner_ends_at": string,
"dinner_starts_at": string,
"id": boolean,
"lunch_ends_at": string,
"lunch_starts_at": string,
"name": string | null,
"operating_weekdays": (number)[],
"privacy_contact_email": string | null,
"setup_completed_at": string | null,
"timezone": string,
"updated_at": string,
"updated_by": string | null,
"workspace_capacity": number
            }
                          SetofOptions: {
        from: "*"
        to: "lab_settings"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_lab_configuration":
{ Args: { "p_acronym": string,"p_name": string,"p_operating_weekdays": (number)[],"p_privacy_contact_email": string,"p_timezone": string,"p_workspace_capacity": number }; Returns: {
              "acronym": string | null,
"created_at": string,
"created_by": string | null,
"dinner_ends_at": string,
"dinner_starts_at": string,
"id": boolean,
"lunch_ends_at": string,
"lunch_starts_at": string,
"name": string | null,
"operating_weekdays": (number)[],
"privacy_contact_email": string | null,
"setup_completed_at": string | null,
"timezone": string,
"updated_at": string,
"updated_by": string | null,
"workspace_capacity": number
            }
                          SetofOptions: {
        from: "*"
        to: "lab_settings"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_lab_settings":
{ Args: { "p_acronym": string,"p_name": string,"p_privacy_contact_email": string,"p_timezone": string }; Returns: {
              "acronym": string | null,
"created_at": string,
"created_by": string | null,
"dinner_ends_at": string,
"dinner_starts_at": string,
"id": boolean,
"lunch_ends_at": string,
"lunch_starts_at": string,
"name": string | null,
"operating_weekdays": (number)[],
"privacy_contact_email": string | null,
"setup_completed_at": string | null,
"timezone": string,
"updated_at": string,
"updated_by": string | null,
"workspace_capacity": number
            }
                          SetofOptions: {
        from: "*"
        to: "lab_settings"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_my_profile":
{ Args: { "p_academic_affiliation"?: Database["public"]['Enums']["academic_affiliation"],"p_address_complement"?: string,"p_address_number"?: string,"p_bio"?: string,"p_birth_date"?: string,"p_city"?: string,"p_country"?: string,"p_cpf"?: string,"p_full_name": string,"p_lattes_url"?: string,"p_nationality_country_code"?: string,"p_neighborhood"?: string,"p_phone"?: string,"p_postal_code"?: string,"p_rg"?: string,"p_state"?: string,"p_street"?: string,"p_weekly_workload_hours"?: number }; Returns: {
              "academic_affiliation": Database["public"]['Enums']["academic_affiliation"] | null,
"avatar_url": string | null,
"bio": string | null,
"created_at": string,
"email": string,
"full_name": string,
"id": string,
"is_active": boolean,
"is_maintainer": boolean,
"lattes_url": string | null,
"nationality_country_code": string | null,
"phone": string | null,
"requires_booking_approval": boolean,
"role": Database["public"]['Enums']["user_role"],
"updated_at": string,
"weekly_workload_hours": number | null
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"update_purchase_request":
{ Args: { "p_estimated_amount": number,"p_for_maintenance"?: boolean,"p_funding_category"?: Database["public"]['Enums']["project_funding_category"],"p_item": string,"p_notes"?: string,"p_project_id"?: string,"p_quantity": number,"p_request_id": string,"p_set_project"?: boolean,"p_urgency"?: Database["public"]['Enums']["purchase_urgency"],"p_url": string }; Returns: {
              "actual_amount": number | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"delivered_at": string | null,
"estimated_amount": number,
"for_maintenance": boolean,
"funding_category": Database["public"]['Enums']["project_funding_category"] | null,
"id": string,
"item": string,
"maintenance_request_id": string | null,
"notes": string | null,
"project_id": string | null,
"purchased_at": string | null,
"quantity": number,
"rejected_reason": string | null,
"requested_by": string | null,
"status": Database["public"]['Enums']["purchase_status"],
"updated_at": string,
"urgency": Database["public"]['Enums']["purchase_urgency"],
"url": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "purchase_requests"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "academic_affiliation": "ic"|"extension"|"intern"|"tcc"|"masters"|"phd"|"postdoc"|"visitor"|"technician"|"faculty"|"other","booking_status": "pending"|"approved"|"in_progress"|"completed"|"cancelled"|"failed"|"rejected","equipment_status": "active"|"maintenance"|"unavailable"|"disabled"|"stopped","feedback_kind": "suggestion"|"bug"|"other","feedback_status": "new"|"seen"|"planned"|"done"|"dismissed","funding_agency": "cnpq"|"fapesp"|"capes"|"sus"|"fap"|"other","invitation_status": "pending"|"accepted"|"expired"|"revoked","maintenance_request_status": "open"|"in_progress"|"resolved"|"cancelled","maintenance_urgency": "low"|"normal"|"urgent","material_category": "filament"|"resin"|"powder"|"other","project_funding_category": "capital"|"custeio"|"bolsas"|"reserva_tecnica"|"outros"|"passagens"|"diarias","project_status": "planning"|"active"|"paused"|"completed"|"archived","purchase_status": "requested"|"approved"|"rejected"|"purchased"|"delivered"|"cancelled","purchase_urgency": "low"|"normal"|"urgent","spool_status": "sealed"|"in_use"|"empty"|"discarded","task_status": "todo"|"in_progress"|"review"|"done","user_role": "coordinator"|"researcher"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "academic_affiliation": ["ic", "extension", "intern", "tcc", "masters", "phd", "postdoc", "visitor", "technician", "faculty", "other"],"booking_status": ["pending", "approved", "in_progress", "completed", "cancelled", "failed", "rejected"],"equipment_status": ["active", "maintenance", "unavailable", "disabled", "stopped"],"feedback_kind": ["suggestion", "bug", "other"],"feedback_status": ["new", "seen", "planned", "done", "dismissed"],"funding_agency": ["cnpq", "fapesp", "capes", "sus", "fap", "other"],"invitation_status": ["pending", "accepted", "expired", "revoked"],"maintenance_request_status": ["open", "in_progress", "resolved", "cancelled"],"maintenance_urgency": ["low", "normal", "urgent"],"material_category": ["filament", "resin", "powder", "other"],"project_funding_category": ["capital", "custeio", "bolsas", "reserva_tecnica", "outros", "passagens", "diarias"],"project_status": ["planning", "active", "paused", "completed", "archived"],"purchase_status": ["requested", "approved", "rejected", "purchased", "delivered", "cancelled"],"purchase_urgency": ["low", "normal", "urgent"],"spool_status": ["sealed", "in_use", "empty", "discarded"],"task_status": ["todo", "in_progress", "review", "done"],"user_role": ["coordinator", "researcher"]
          }
        }
} as const
